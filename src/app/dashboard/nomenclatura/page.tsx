// src/app/dashboard/nomenclatura/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

type Row = {
  id: number;
  nombre: string;
  descripcion: string | null;
  createdAt?: string;
};

export default function NomenclaturaList() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/nomenclaturas", { cache: "no-store" });
        const json = await res.json();

        // ✅ si la API devuelve { ok, data }, usamos data; si no, intentamos json directo
        const list: Row[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : [];

        setRows(list);
      } catch (e) {
        console.error("Load list failed:", e);
        setRows([]); // fallback
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Usa tu Sidebar original con role fijo por ahora */}
      <Sidebar role="ADMIN" />

      <main className="flex-1 bg-slate-100">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Nomenclatura Contable</h1>
            <button
              onClick={() => router.push("/dashboard/nomenclatura/crear")}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              + Agregar Nomenclatura Contable
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
                  <tr>
                    <td colSpan={4} className="p-6 text-slate-500">
                      Cargando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-slate-500">
                      No hay nomenclaturas aún.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/nomenclatura/${r.id}`)}
                    >
                      <td className="p-3">{r.id}</td>
                      <td className="p-3">{r.nombre}</td>
                      <td className="p-3">{r.descripcion ?? "—"}</td>
                      <td className="p-3">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
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
