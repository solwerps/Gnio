// src/app/dashboard/contador/[usuario]/empresas/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";

type EmpresaRow = {
  id: number;
  nit: string;
  nombre: string;
  actividadEconomica: string; // ya normalizada para la tabla
  sectorEconomico: string;
};

function getActividad(e: any): string {
  if (!e) return "—";

  // 1) String directo
  const direct =
    e.actividadEconomicaPrincipal ||
    e.actividadEconomica ||
    e.actEconSat ||
    e.actEconomica;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  // 2) Objeto { codigo, descripcion } que pudo guardarse
  const obj =
    e.actividadEconomicaSat ||
    e.actividadEconomicaPrincipalSat ||
    e.actividadEconomicaObj ||
    null;
  if (obj && (obj.codigo || obj.descripcion)) {
    const c = String(obj.codigo ?? "").trim();
    const d = String(obj.descripcion ?? "").trim();
    if (c && d) return `${c} — ${d}`;
    if (d) return d;
    if (c) return c;
  }

  // 3) Pares sueltos de código / descripción con nombres posibles
  const code =
    e.actividadEconomicaSatCodigo ||
    e.codigoActividadEconomicaSat ||
    e.codigoActividadEconomica ||
    e.codigoActividad ||
    e.codigo;
  const desc =
    e.actividadEconomicaSatDescripcion ||
    e.descripcionActividadEconomicaSat ||
    e.descripcionActividadEconomica ||
    e.descripcionActividad ||
    e.descripcion;

  const c = code ? String(code).trim() : "";
  const d = desc ? String(desc).trim() : "";
  if (c && d) return `${c} — ${d}`;
  if (d) return d;
  if (c) return c;

  return "—";
}

export default function EmpresasPage() {
  const params = useParams<{ usuario: string }>();
  const search = useSearchParams();
  const router = useRouter();

  // Si tu app usa '?tenant=', se preserva; si no, cae al [usuario]
  const tenant = search.get("tenant") || params.usuario;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EmpresaRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/empresas?tenant=${tenant}`, {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json();

        if (!alive) return;

        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        setRows(
          list.map((e: any) => ({
            id: Number(e.id),
            nit: String(e.nit ?? ""),
            nombre: String(e.nombre ?? ""),
            // 👇 aquí normalizamos “Actividad económica principal (catálogo SAT)”
            actividadEconomica: getActividad(e),
            sectorEconomico:
              String(
                e.sectorEconomico ??
                  e.sector ??
                  e.sectorPrincipal ??
                  ""
              ) || "—",
          }))
        );
      } catch (err) {
        console.error(err);
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tenant]);

  const goCrear = () =>
    router.push(
      `/dashboard/contador/${params.usuario}/empresas/crear${
        search.toString() ? `?${search.toString()}` : ""
      }`
    );

  const goCargar = () =>
    router.push(
      `/dashboard/contador/${params.usuario}/empresas/cargar${
        search.toString() ? `?${search.toString()}` : ""
      }`
    );

  return (
    <div className="min-h-screen w-full flex">
      {/* ✅ Sidebar fijo del CONTADOR */}
      <Sidebar role="CONTADOR" usuario={String(params.usuario)} active="Empresas" />

      <main className="flex-1 p-6 lg:p-10 bg-white">
        <div className="max-w-[1200px] mx-auto">
          <h1 className="text-4xl font-bold mb-6">Empresas</h1>

          <div className="flex justify-end gap-3 mb-4">
            <button
              onClick={goCrear}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow"
            >
              <span className="text-lg leading-none">＋</span>
              Agregar Empresa
            </button>

            <button
              onClick={goCargar}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700"
              title="Carga masiva por archivo"
            >
              <span className="text-lg leading-none">⭳</span>
              Cargar Empresas
            </button>
          </div>

          <div className="rounded-xl overflow-hidden border border-neutral-200">
            <table className="w-full text-left">
              <thead className="bg-neutral-900 text-white">
                <tr>
                  <th className="px-5 py-3 w-[200px]">NIT</th>
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3 w-[360px]">Actividad Económica</th>
                  <th className="px-5 py-3 w-[220px]">Sector</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-neutral-500">
                      Cargando...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-neutral-500">
                      No hay empresas creadas aún.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-neutral-50 cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/dashboard/contador/${params.usuario}/empresas/${r.id}${
                            search.toString() ? `?${search.toString()}` : ""
                          }`
                        )
                      }
                    >
                      <td className="px-5 py-4">{r.nit || "—"}</td>
                      <td className="px-5 py-4">{r.nombre || "—"}</td>
                      <td className="px-5 py-4 truncate">{r.actividadEconomica || "—"}</td>
                      <td className="px-5 py-4">{r.sectorEconomico || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
