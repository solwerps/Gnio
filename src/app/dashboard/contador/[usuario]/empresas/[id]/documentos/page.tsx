// src/app/dashboard/usuario/empresas/[id]/documentos/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import DocumentosTemplate from "@/components/templates/documentos"; // 👈 ESTE

function monthPretty(ym: string) {
  try {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("es-GT", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return ym;
  }
}

export default function Page() {
  const p = useParams() as { usuario?: string; Usuarios?: string; id?: string };
  const usuario = String(p.usuario ?? p.Usuarios ?? "usuario");
  const empresaId = String(p.id ?? "");

  const router = useRouter();

  const [operacion, setOperacion] = useState<"" | "compra" | "venta">("");
  const [mes, setMes] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [empresaNombre, setEmpresaNombre] = useState("Empresa");
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      try {
        const r = await fetch(`/api/empresas/${empresaId}`, { cache: "no-store" });
        const j = await r.json();
        const d = j?.data ?? j;
        setEmpresaNombre(d?.nombre || "Empresa");
      } catch {}
    })();
  }, [empresaId]);

  // si tu ruta REAL es /dashboard/usuario/... cambia esto 👇
  const base = `/dashboard/usuario/${usuario}/empresas/${empresaId}/documentos`;

  const onDescargar = async () => {
    const q = new URLSearchParams({ empresaId, mes, operacion, format: "csv" });
    const r = await fetch(`/api/documentos?${q.toString()}`);
    if (!r.ok) return alert("No se pudo exportar CSV");
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `facturas_${empresaId}_${mes}_${operacion || "todas"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900">
      <div className="fixed left-0 top-0 hidden h-screen w-[260px] overflow-y-auto md:block">
        <EmpresaSidebar empresaId={empresaId} forceUsuario={usuario} />
      </div>

      <main className="md:ml-[260px] px-4 sm:px-6 py-6">
        <div className="mx-auto w-full max-w-[1120px]">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight uppercase">
            FACTURAS/<span className="whitespace-pre">{empresaNombre}</span>
          </h1>

          {/* filtros */}
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-neutral-700">
                Selecciona el tipo de Operación de los documentos:
              </label>
              <div className="relative">
                <select
                  value={operacion}
                  onChange={(e) => setOperacion(e.target.value as "" | "compra" | "venta")}
                  className="h-11 w-[280px] rounded-xl border border-neutral-300 bg-white px-3 pr-9 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Seleccionar</option>
                  <option value="compra">Compra</option>
                  <option value="venta">Venta</option>
                </select>
                <button
                  type="button"
                  onClick={() => setOperacion("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 text-neutral-500 hover:text-neutral-700"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-neutral-700">Selecciona la fecha:</label>
              <input
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="h-11 w-[220px] rounded-xl border border-neutral-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-xs text-neutral-500 -mt-1">{monthPretty(mes)}</span>
            </div>
          </div>

          {/* acciones */}
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={onDescargar}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Descargar Facturas
            </button>
            <button
              onClick={() => router.push(`${base}/carga`)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Cargar Facturas
            </button>
            <button
              onClick={() => router.push(`${base}/create`)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Agregar Factura
            </button>
            <button
              onClick={() => router.push(`${base}/rectificaciones`)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Rectificación de Facturas
            </button>
          </div>

          {/* cuadro */}
          <section className="mt-6">
            <div className="mx-auto w-full max-w-[1120px]">
              <DocumentosTemplate empresaId={empresaId} operacion={operacion} mes={mes} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
