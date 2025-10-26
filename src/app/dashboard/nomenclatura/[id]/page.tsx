// /src/app/dashboard/nomenclatura/crear/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { CuentaRow, Naturaleza, Tipo } from "@/types/nomenclatura";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const reindexRows = (arr: CuentaRow[]) => arr.map((row, idx) => ({ ...row, orden: idx + 1 }));

type RowDB = Partial<CuentaRow> & {
  lockAdd?: boolean;
  lockDelete?: boolean;
  isPlantilla?: boolean;
};
type PageSize = number | "ALL";

export default function NomenclaturaDetallesPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [rows, setRows] = useState<CuentaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [busyDelete, setBusyDelete] = useState(false);
  const [busySave, setBusySave] = useState(false);

  // paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<PageSize>(10);

  // DnD
  const dragIndexRef = useRef<number | null>(null);
  const onDragStart = (visualIndex: number, start: number) => {
    dragIndexRef.current = start + visualIndex;
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (visualIndex: number, start: number) => {
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

  // permisos
  const canAdd = (r: any) => {
    if (typeof r.lockAdd === "boolean") return !r.lockAdd;
    if (r.isPlantilla && r.principalDetalle === "P") return false;
    return true;
  };
  const canDelete = (r: any) => {
    if (typeof r.lockDelete === "boolean") return !r.lockDelete;
    return !r.isPlantilla;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/nomenclaturas/${id}`, { cache: "no-store" });
        const payload = await res.json();

        // Normalización flexible de payload
        const cab = payload?.data ?? payload?.nomenclatura ?? payload ?? {};
        setNombre(cab.nombre ?? cab.name ?? "");
        setDescripcion(cab.descripcion ?? cab.description ?? "");

        const fromDb: RowDB[] = cab.cuentas ?? cab.items ?? [];

        const normalizados: CuentaRow[] = fromDb
          .map((c, idx) => {
            const base: any = {
              orden: Number(c.orden ?? idx + 1),
              cuenta: c.cuenta ?? "",
              descripcion: c.descripcion ?? "",
              debeHaber: (c.debeHaber ?? "DEBE") as any,
              principalDetalle: (c.principalDetalle ?? "P") as any,
              nivel: Number(c.nivel ?? 1),
              tipo: (c.tipo ?? "BALANCE_GENERAL") as any,
              naturaleza: (c.naturaleza ?? "REVISAR") as any,
              isPlantilla: !!c.isPlantilla,

              lockCuenta: !!c.lockCuenta,
              lockDescripcion: !!c.lockDescripcion,
              lockDebeHaber: !!c.lockDebeHaber,
              lockPrincipalDetalle: !!c.lockPrincipalDetalle,
              lockNivel: !!c.lockNivel,
              lockTipo: !!c.lockTipo,
              lockNaturaleza: !!c.lockNaturaleza,

              lockAdd: typeof (c as any).lockAdd === "boolean" ? (c as any).lockAdd : undefined,
              lockDelete: typeof (c as any).lockDelete === "boolean" ? (c as any).lockDelete : undefined,
            };
            return base as CuentaRow;
          })
          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

        setRows(reindexRows(normalizados));
      } catch (e) {
        console.error("GET /api/nomenclaturas/[id] failed", e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const naturalezaOptions = useMemo<Naturaleza[]>(
    () => ["ACTIVO", "PASIVO", "CAPITAL", "INGRESOS", "COSTOS", "GASTOS", "OTROS INGRESOS", "OTROS GASTOS", "REVISAR"],
    []
  );
  const tipoOptions = useMemo<Tipo[]>(
    () => ["BALANCE_GENERAL", "ESTADO_RESULTADOS", "CAPITAL"],
    []
  );

  // agrega debajo heredando del padre
  const addAfter = (r: CuentaRow) => {
    if (!canAdd(r)) return;
    setRows((prev) => {
      const idx = prev.findIndex((x) => x.orden === r.orden);
      const nueva: CuentaRow = {
        orden: 999999,
        cuenta: "",
        descripcion: "",
        debeHaber: "DEBE",
        principalDetalle: "D",
        nivel: r.nivel ?? 1,
        tipo: r.tipo ?? "BALANCE_GENERAL",
        naturaleza: (r.naturaleza ?? "REVISAR") as Naturaleza,
        isPlantilla: false,

        lockCuenta: false,
        lockDescripcion: false,
        lockDebeHaber: false,
        lockPrincipalDetalle: false,
        lockNivel: false,
        lockTipo: false,
        lockNaturaleza: false,

        ...(typeof (r as any).lockAdd === "boolean" ? { lockAdd: false } : {}),
        ...(typeof (r as any).lockDelete === "boolean" ? { lockDelete: false } : {}),
      };
      const cp = [...prev];
      cp.splice(idx + 1, 0, nueva);
      return reindexRows(cp);
    });
  };

  const removeRow = (r: CuentaRow) => {
    if (!canDelete(r)) return;
    setRows((prev) => reindexRows(prev.filter((x) => x.orden !== r.orden)));
  };

  const guardarCambios = async () => {
    try {
      setBusySave(true);
      const payload = reindexRows(rows).map((r) => {
        const out: any = {
          orden: r.orden,
          cuenta: r.cuenta,
          descripcion: r.descripcion,
          debeHaber: r.debeHaber,
          principalDetalle: r.principalDetalle,
          nivel: r.nivel,
          tipo: r.tipo,
          naturaleza: r.naturaleza,
          isPlantilla: r.isPlantilla,

          lockCuenta: r.lockCuenta,
          lockDescripcion: r.lockDescripcion,
          lockDebeHaber: r.lockDebeHaber,
          lockPrincipalDetalle: r.lockPrincipalDetalle,
          lockNivel: r.lockNivel,
          lockTipo: r.lockTipo,
          lockNaturaleza: r.lockNaturaleza,
        };
        if (typeof (r as any).lockAdd === "boolean") out.lockAdd = (r as any).lockAdd;
        if (typeof (r as any).lockDelete === "boolean") out.lockDelete = (r as any).lockDelete;
        return out;
      });

      const res = await fetch(`/api/nomenclaturas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, descripcion, cuentas: payload }),
      });

      if (!res.ok) throw new Error("Guardar falló");
      alert("Cambios guardados");
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar");
    } finally {
      setBusySave(false);
    }
  };

  // BORRAR NOMENCLATURA COMPLETA
  const borrarNomenclatura = async () => {
    if (!confirm("¿Seguro que deseas borrar esta nomenclatura?")) return;
    try {
      setBusyDelete(true);
      const res = await fetch(`/api/nomenclaturas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo borrar");
      alert("Nomenclatura eliminada");
      window.location.href = "/dashboard/nomenclatura";
    } catch (e) {
      console.error(e);
      alert("Error al borrar nomenclatura");
    } finally {
      setBusyDelete(false);
    }
  };

  // paginación
  const total = rows.length;
  const showAll = rowsPerPage === "ALL";
  const numericSize = showAll ? total || 1 : (rowsPerPage as number);
  const lastPage = Math.max(0, Math.ceil(total / numericSize) - 1);
  const start = showAll ? 0 : page * numericSize;
  const end = showAll ? total : Math.min(start + numericSize, total);
  const pageRows = rows.slice(start, end);

  const goFirst = () => setPage(0);
  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => setPage((p) => Math.min(lastPage, p + 1));
  const goLast = () => setPage(lastPage);

  useEffect(() => {
    if (!showAll && page > lastPage) setPage(lastPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, rowsPerPage]);

  return (
    <div className="min-h-screen flex">
      <Sidebar role="ADMIN" />

      <main className="flex-1 bg-slate-100">
        <div className="max-w-8xl mx-auto p-6">
          <h1 className="text-3xl font-bold">NOMENCLATURA DETALLES</h1>

          <section className="mt-6 bg-white rounded-xl shadow p-4">
            <h2 className="text-slate-700 font-semibold">Información General:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-xs text-slate-500">Nombre</label>
                <input
                  className="w-full mt-1 border rounded-lg px-3 py-2"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Descripción</label>
                <input
                  className="w-full mt-1 border rounded-lg px-3 py-2"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={borrarNomenclatura}
                className="bg-rose-600 text-white px-4 py-2 rounded disabled:opacity-60"
                disabled={busyDelete || loading}
                title="Borrar nomenclatura"
              >
                {busyDelete ? "Borrando..." : "Borrar Nomenclatura"}
              </button>
              <button
                onClick={guardarCambios}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
                disabled={busySave || loading}
              >
                {busySave ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </section>

          <section className="mt-6 bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-slate-700 font-semibold">Cuentas:</h2>

              <div className="flex items-center gap-4">
                <div className="text-sm">
                  Rows per page:{" "}
                  <select
                    className="border rounded px-2 py-1"
                    value={rowsPerPage}
                    onChange={(e) => {
                      const val = e.target.value === "ALL" ? "ALL" : Number(e.target.value);
                      setRowsPerPage(val);
                      setPage(0);
                    }}
                  >
                    {[10, 15, 20, 25, 30].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                    <option value="ALL">All</option>
                  </select>
                </div>
                <div className="text-sm">
                  {total === 0 ? "0-0 of 0" : `${showAll ? 1 : start + 1}-${end} of ${total}`}
                </div>
                <div className="flex gap-2">
                  <button className="border rounded px-2" onClick={goFirst} disabled={showAll || page === 0}>⏮</button>
                  <button className="border rounded px-2" onClick={goPrev} disabled={showAll || page === 0}>◀</button>
                  <button className="border rounded px-2" onClick={goNext} disabled={showAll || page === lastPage}>▶</button>
                  <button className="border rounded px-2" onClick={goLast} disabled={showAll || page === lastPage}>⏭</button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-6 text-slate-500">Cargando…</div>
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
                    {pageRows.map((r, i) => {
                      const addDisabled = !canAdd(r as any);
                      const deleteDisabled = !canDelete(r as any);

                      return (
                        <tr
                          key={r.orden}
                          className="border-b cursor-move"
                          draggable
                          onDragStart={() => onDragStart(i, start)}
                          onDragOver={onDragOver}
                          onDrop={() => onDrop(i, start)}
                          title="Arrastra para reordenar"
                        >
                          <td className={cx("px-3 py-2", r.lockCuenta && "bg-slate-200")}>
                            <input
                              className="w-32 border rounded px-2 py-1"
                              value={r.cuenta}
                              disabled={r.lockCuenta}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) => x.orden === r.orden ? { ...x, cuenta: e.target.value } : x)
                                )
                              }
                            />
                          </td>
                          <td className={cx("px-3 py-2", r.lockDescripcion && "bg-slate-200")}>
                            <input
                              className="w-64 border rounded px-2 py-1"
                              value={r.descripcion}
                              disabled={r.lockDescripcion}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) => x.orden === r.orden ? { ...x, descripcion: e.target.value } : x)
                                )
                              }
                            />
                          </td>
                          <td className={cx("px-3 py-2", r.lockDebeHaber && "bg-slate-200")}>
                            <select
                              className="border rounded px-2 py-1"
                              value={r.debeHaber}
                              disabled={r.lockDebeHaber}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) => x.orden === r.orden ? { ...x, debeHaber: e.target.value as any } : x)
                                )
                              }
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
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) => x.orden === r.orden ? { ...x, principalDetalle: e.target.value as any } : x)
                                )
                              }
                            >
                              <option value="P">P</option>
                              <option value="D">D</option>
                            </select>
                          </td>
                          <td className={cx("px-3 py-2", r.lockNivel && "bg-slate-200")}>
                            <input
                              className="w-16 border rounded px-2 py-1"
                              type="number"
                              value={r.nivel}
                              disabled={r.lockNivel}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) => x.orden === r.orden ? { ...x, nivel: Number(e.target.value) } : x)
                                )
                              }
                            />
                          </td>
                          <td className={cx("px-3 py-2", r.lockTipo && "bg-slate-200")}>
                            <select
                              className="border rounded px-2 py-1"
                              value={r.tipo}
                              disabled={r.lockTipo}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) => x.orden === r.orden ? { ...x, tipo: e.target.value as any } : x)
                                )
                              }
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
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) => x.orden === r.orden ? { ...x, naturaleza: e.target.value as any } : x)
                                )
                              }
                            >
                              {naturalezaOptions.map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              className={cx(
                                "px-2 py-1 rounded text-white",
                                addDisabled ? "bg-slate-300 cursor-not-allowed" : "bg-emerald-600"
                              )}
                              disabled={addDisabled}
                              onClick={() => addAfter(r)}
                            >
                              +
                            </button>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              className={cx(
                                "px-2 py-1 rounded text-white",
                                deleteDisabled ? "bg-slate-300 cursor-not-allowed" : "bg-rose-600"
                              )}
                              disabled={deleteDisabled}
                              onClick={() => removeRow(r)}
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
