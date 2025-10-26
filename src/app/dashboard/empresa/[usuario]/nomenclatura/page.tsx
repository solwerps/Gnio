//src/app/dashboard/empresa/[usuario]/nomenclatura/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

type Row = { id: number; nombre: string; descripcion: string | null; createdAt?: string };

export default function NomenclaturaListEmpresa() {
  const router = useRouter();
  const { usuario } = useParams<{ usuario: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/nomenclaturas?tenant=${usuario}`, {
          cache: "no-store",
          credentials: "include",
        });
        const json = await res.json();
        setRows(Array.isArray(json?.data) ? json.data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [usuario]);

  return (
    <div className="min-h-screen flex">
      <Sidebar role="EMPRESA" usuario={String(usuario)} />
      <main className="flex-1 bg-slate-100">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Nomenclatura Contable</h1>
            <button
              onClick={() => router.push(`/dashboard/empresa/${usuario}/nomenclatura/crear`)}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              + Agregar Nomenclatura
            </button>
          </div>

          <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Descripción</th>
                  <th className="px-3 py-2 text-left">Creado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="p-6 text-slate-500">Cargando…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-slate-500">No hay nomenclaturas.</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/empresa/${usuario}/nomenclatura/${r.id}`)}
                    >
                      <td className="p-3">{r.id}</td>
                      <td className="p-3">{r.nombre}</td>
                      <td className="p-3">{r.descripcion ?? "—"}</td>
                      <td className="p-3">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</td>
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
