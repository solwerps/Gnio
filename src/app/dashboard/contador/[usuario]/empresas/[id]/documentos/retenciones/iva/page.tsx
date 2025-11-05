// src/app/dashboard/contador/[usuarios]/empresas/[id]/documentos/retenciones/iva/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";

type RetencionIVA = {
  uuid: string;
  empresaId: number;
  fechaTrabajo: string;
  nitRetenedor: string;
  nombreRetenedor: string;
  estadoConstancia: string;
  constancia: string;
  fechaEmision: string;
  totalFactura: number;
  importeNeto: number;
  afectoRetencion: number;
  totalRetencion: number;
};

export default function RetencionesIvaPage() {
  const params = useParams() as { usuarios?: string; usuario?: string; id: string };
  const router = useRouter();
  const usuario = params.usuarios ?? params.usuario ?? "";
  const empresaId = String(params.id);
  const base = `/dashboard/contador/${usuario}/empresas/${empresaId}/documentos/retenciones/iva`;

  const [empresaNombre, setEmpresaNombre] = useState<string>("");
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [rows, setRows] = useState<RetencionIVA[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/empresas/${empresaId}`, { cache: "no-store" });
        const j = await r.json();
        const d = j?.data ?? j;
        setEmpresaNombre(d?.nombre || "");
      } catch { /* ignore */ }
    })();
  }, [empresaId]);

  async function fetchData() {
    setLoading(true);
    try {
      const q = new URLSearchParams({ empresaId, fecha: mes });
      const r = await fetch(`/api/retenciones/iva?${q.toString()}`, { cache: "no-store" });
      const j = await r.json();
      setRows(j?.status === 200 ? (j.data ?? []) : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [empresaId, mes]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="fixed left-0 top-0 hidden h-screen w-[260px] md:block bg-white">
        <EmpresaSidebar empresaId={empresaId} forceUsuario={usuario} />
      </div>
      <main className="md:ml-[260px] px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Retenciones IVA{empresaNombre ? ` / ${empresaNombre}` : ""}
          </h1>
          <button
            onClick={() => router.push(`${base}/cargar`)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Cargar Retenciones
          </button>
        </div>

        <div className="mb-4">
          <label className="text-sm font-semibold text-neutral-700 block mb-1">Selecciona la fecha:</label>
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="max-h-[60vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-2 text-left">NIT RETENEDOR</th>
                  <th className="px-4 py-2 text-left">NOMBRE RETENEDOR</th>
                  <th className="px-4 py-2 text-left">ESTADO CONSTANCIA</th>
                  <th className="px-4 py-2 text-left">CONSTANCIA</th>
                  <th className="px-4 py-2 text-left">FECHA EMISION</th>
                  <th className="px-4 py-2 text-right">TOTAL FACTURA</th>
                  <th className="px-4 py-2 text-right">IMPORTE NETO</th>
                  <th className="px-4 py-2 text-right">AFECTO RETENCIÓN</th>
                  <th className="px-4 py-2 text-right">TOTAL RETENCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-6 text-center text-neutral-400">Cargando…</td></tr>
                ) : rows.length ? (
                  rows.map((r) => (
                    <tr key={r.uuid} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-2">{r.nitRetenedor}</td>
                      <td className="px-4 py-2">{r.nombreRetenedor}</td>
                      <td className="px-4 py-2">{r.estadoConstancia}</td>
                      <td className="px-4 py-2">{r.constancia}</td>
                      <td className="px-4 py-2">{new Date(r.fechaEmision).toLocaleDateString("es-GT")}</td>
                      <td className="px-4 py-2 text-right">Q{r.totalFactura.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">Q{r.importeNeto.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">Q{r.afectoRetencion.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-emerald-600">Q{r.totalRetencion.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={9} className="px-4 py-6 text-center text-neutral-400">No hay retenciones para ese mes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
