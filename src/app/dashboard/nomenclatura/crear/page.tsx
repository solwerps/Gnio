//src/app/dashboard/nomenclatura/crear/page.tsx
// /src/app/dashboard/nomenclatura/crear/page.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { CuentaRow, Naturaleza, Tipo } from "@/types/nomenclatura";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

// 🔢 util: reindexar orden 1..N de acuerdo a la posición actual
const reindexRows = (arr: CuentaRow[]) =>
  arr.map((row, idx) => ({ ...row, orden: idx + 1 }));

export default function CrearNomenclaturaPage() {
  const router = useRouter();

  // tabla
  const [rows, setRows] = useState<CuentaRow[]>([]);
  const [loading, setLoading] = useState(true);

  // info general
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // paginación
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  // ===== Drag & Drop =====
  const dragIndexRef = useRef<number | null>(null);

  const onDragStart = (visualIndex: number) => {
    dragIndexRef.current = start + visualIndex; // index global (no solo de la página)
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // necesario para permitir el drop
  };

  const onDrop = (visualIndex: number) => {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from == null) return;
    const to = start + visualIndex;

    setRows((prev) => {
      if (from === to) return prev;
      const cp = [...prev];
      const [moved] = cp.splice(from, 1);
      cp.splice(to, 0, moved);
      return reindexRows(cp);
    });
  };
  // =======================

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/nomenclaturas/plantilla");
      const data = await res.json();

      const normalizadas: CuentaRow[] = (data.cuentas || []).map((r: CuentaRow) => {
        const legacy = (r as any).lockRowActions ?? true; // si no venía, asumimos bloqueado
        return {
          ...r,
          lockAdd: (r as any).lockAdd ?? legacy, // si antes estaba bloqueado, también bloquea “+”
          lockDelete: (r as any).lockDelete ?? (r.isPlantilla ? true : legacy), // plantilla nunca borra por defecto
        };
      });

      setRows(reindexRows(normalizadas));
      setLoading(false);
    })();
  }, []);

  // selects
  const naturalezaOptions = useMemo<Naturaleza[]>(
    () => ["ACTIVO","PASIVO","CAPITAL","INGRESOS","COSTOS","GASTOS","OTROS INGRESOS","OTROS GASTOS","REVISAR"],
    []
  );
  const tipoOptions = useMemo<Tipo[]>(() => ["BALANCE_GENERAL", "ESTADO_RESULTADOS", "CAPITAL"], []);
  const nivelOptions = [1, 2, 3, 4, 5];

  // "+": insertar debajo, heredando del padre
  const addAfter = (r: CuentaRow) => {
    if ((r as any).lockAdd) return;
    setRows((prev) => {
      const globalIdx = prev.findIndex((x) => x.orden === r.orden);
      const nueva: CuentaRow = {
        orden: 999999, // provisional; luego reindexamos
        cuenta: "",
        descripcion: "",
        debeHaber: "DEBE",
        principalDetalle: "D",
        nivel: r.nivel,
        tipo: r.tipo,
        naturaleza: r.naturaleza,
        isPlantilla: false,

        lockCuenta: false,
        lockDescripcion: false,
        lockDebeHaber: false,
        lockPrincipalDetalle: false,
        lockNivel: false,
        lockTipo: false,
        lockNaturaleza: false,

        lockAdd: false,
        lockDelete: false,
      };
      const cp = [...prev];
      cp.splice(globalIdx + 1, 0, nueva);
      return reindexRows(cp);
    });
  };

  const removeRow = (r: CuentaRow) => {
    if ((r as any).lockDelete) return;
    setRows((prev) => reindexRows(prev.filter((x) => x.orden !== r.orden)));
  };

  const guardar = async () => {
    try {
      const res = await fetch("/api/nomenclaturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          descripcion,
          versionGNIO: "GNIO 1.0",
          cuentas: reindexRows(rows), // ✅ enviamos en el orden visual
        }),
      });
      const data = await res.json();

      if (data.ok) {
        alert(`Guardado (filas: ${data.totalFilas})`);
        // router.push("/dashboard/nomenclatura");
      } else {
        alert("No se pudo guardar");
        console.error(data);
      }
    } catch (e) {
      alert("No se pudo guardar");
      console.error(e);
    }
  };

  // paginación
  const total = rows.length;
  const start = page * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = rows.slice(start, end);

  const nextPage = () => setPage((p) => Math.min(p + 1, Math.floor((total - 1) / pageSize)));
  const prevPage = () => setPage((p) => Math.max(p - 1, 0));

  return (
    <div className="min-h-screen flex">
      <Sidebar role="ADMIN" />

      <main className="flex-1 bg-slate-200">
        <div className="max-w-8xl mx-5 p-6">
          <h1 className="text-3xl font-bold">
            Nomenclatura Contable <span className="font-light">/ Formulario</span>
          </h1>

          <section className="mt-6 bg-white rounded-xl shadow p-4">
            <h2 className="text-slate-800 font-semibold">Información General:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-xs text-slate-500">Nombre</label>
                <input className="w-full mt-1 border rounded-lg px-3 py-2" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-500">Descripción</label>
                <input className="w-full mt-1 border rounded-lg px-3 py-2" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="mt-6 bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-slate-700 font-semibold">Cuentas:</h2>

              <div className="flex items-center gap-2 text-sm">
                <span>Rows per page:</span>
                <select className="border rounded px-2 py-1" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}>
                  {[10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="ml-3">{`${Math.min(start + 1, total)}-${end} of ${total}`}</span>
                <button className="px-2 py-1 border rounded" onClick={prevPage} disabled={page === 0}>‹</button>
                <button className="px-2 py-1 border rounded" onClick={nextPage} disabled={end >= total}>›</button>
              </div>
            </div>

            {loading ? (
              <div className="p-6 text-slate-500">Cargando plantilla…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left">CUENTA</th>
                      <th className="px-3 py-2 text-left">DESCRIPCIÓN</th>
                      <th className="px-3 py-2 text-left">DEBE/HABER</th>
                      <th className="px-3 py-2 text-left">PRINCIPAL/DETALLE</th>
                      <th className="px-3 py-2 text-left">NIVEL</th>
                      <th className="px-3 py-2 text-left">TIPO</th>
                      <th className="px-3 py-2 text-left">NATURALEZA</th>
                      <th className="px-3 py-2 text-center">+</th>
                      <th className="px-3 py-2 text-center">🗑</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r, i) => (
                      <tr
                        key={r.orden}
                        className="border-b cursor-move"
                        draggable
                        onDragStart={() => onDragStart(i)}
                        onDragOver={onDragOver}
                        onDrop={() => onDrop(i)}
                        title="Arrastra para reordenar"
                      >
                        <td className={cx("px-3 py-2", r.lockCuenta && "bg-slate-200")}>
                          <input
                            className="w-32 border rounded px-2 py-1"
                            value={r.cuenta}
                            disabled={r.lockCuenta}
                            onChange={(e) => setRows((prev) => prev.map((x) => x.orden === r.orden ? { ...x, cuenta: e.target.value } : x))}
                          />
                        </td>
                        <td className={cx("px-3 py-2", r.lockDescripcion && "bg-slate-200")}>
                          <input
                            className="w-64 border rounded px-2 py-1"
                            value={r.descripcion}
                            disabled={r.lockDescripcion}
                            onChange={(e) => setRows((prev) => prev.map((x) => x.orden === r.orden ? { ...x, descripcion: e.target.value } : x))}
                          />
                        </td>
                        <td className={cx("px-3 py-2", r.lockDebeHaber && "bg-slate-200")}>
                          <select
                            className="border rounded px-2 py-1"
                            value={r.debeHaber}
                            disabled={r.lockDebeHaber}
                            onChange={(e) => setRows((prev) => prev.map((x) => x.orden === r.orden ? { ...x, debeHaber: e.target.value as any } : x))}
                          >
                            <option value="DEBE">DEBE</option>
                            <option value="HABER">HABER</option>
                          </select>
                        </td>
                        <td className={cx("px-3 py-2", r.lockPrincipalDetalle && "bg-slate-200")}>
                          <select
                            className="border rounded px-2 py-1"
                            value={r.principalDetalle}
                            disabled={r.lockPrincipalDetalle}
                            onChange={(e) => setRows((prev) => prev.map((x) => x.orden === r.orden ? { ...x, principalDetalle: e.target.value as any } : x))}
                          >
                            <option value="P">P</option>
                            <option value="D">D</option>
                          </select>
                        </td>
                        <td className={cx("px-3 py-2", r.lockNivel && "bg-slate-200")}>
                          <select
                            className="border rounded px-2 py-1 w-20"
                            value={r.nivel}
                            disabled={r.lockNivel}
                            onChange={(e) => setRows((prev) => prev.map((x) => x.orden === r.orden ? { ...x, nivel: Number(e.target.value) } : x))}
                          >
                            {nivelOptions.map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </td>
                        <td className={cx("px-3 py-2", r.lockTipo && "bg-slate-200")}>
                          <select
                            className="border rounded px-2 py-1"
                            value={r.tipo}
                            disabled={r.lockTipo}
                            onChange={(e) => setRows((prev) => prev.map((x) => x.orden === r.orden ? { ...x, tipo: e.target.value as any } : x))}
                          >
                            {tipoOptions.map((t) => (
                              <option key={t} value={t}>{t.replace("_", " ")}</option>
                            ))}
                          </select>
                        </td>
                        <td className={cx("px-3 py-2", r.lockNaturaleza && "bg-slate-200")}>
                          <select
                            className="border rounded px-2 py-1"
                            value={r.naturaleza}
                            disabled={r.lockNaturaleza}
                            onChange={(e) => setRows((prev) => prev.map((x) => x.orden === r.orden ? { ...x, naturaleza: e.target.value as any } : x))}
                          >
                            {naturalezaOptions.map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            className={cx("px-2 py-1 rounded text-white", (r as any).lockAdd ? "bg-slate-300 cursor-not-allowed" : "bg-emerald-600")}
                            disabled={(r as any).lockAdd}
                            onClick={() => addAfter(r)}
                          >
                            +
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            className={cx("px-2 py-1 rounded text-white", (r as any).lockDelete ? "bg-slate-300 cursor-not-allowed" : "bg-rose-600")}
                            disabled={(r as any).lockDelete}
                            onClick={() => removeRow(r)}
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 flex justify-end">
              <button onClick={guardar} className="bg-blue-600 text-white px-4 py-2 rounded">
                Guardar Nomenclatura Contable
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
