// src/app/dashboard/empresa/[usuario]/nomenclatura/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { CuentaRow, Naturaleza, Tipo } from "@/types/nomenclatura";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const reindexRows = (arr: CuentaRow[]) => arr.map((row, idx) => ({ ...row, orden: idx + 1 }));

// Enum helpers
const toEnumToken = (v: string) => (v ?? "").replaceAll(" ", "_").toUpperCase();
const toPretty = (v: string) => (v ?? "").replaceAll("_", " ").toUpperCase();

const ROOT_IDS = ["1", "2", "3", "4", "5", "6"] as const;
type RootId = typeof ROOT_IDS[number];

const rootLabel: Record<RootId, string> = {
  "1": "ACTIVO", "2": "PASIVO", "3": "CAPITAL", "4": "INGRESOS",
  "5": "COSTOS Y GASTOS", "6": "OTROS INGRESOS Y GASTOS",
};
const rootColors: Record<RootId, string> = {
  "1": "bg-emerald-600", "2": "bg-violet-600", "3": "bg-fuchsia-600",
  "4": "bg-amber-500", "5": "bg-sky-600", "6": "bg-rose-600",
};

const isRootRow = (r: CuentaRow) =>
  Number(r.nivel) === 1 && typeof r.cuenta === "string" && ROOT_IDS.includes(r.cuenta as RootId);
const leadingDigit = (cuenta?: string) => (cuenta && /^\d/.test(cuenta) ? cuenta[0] : undefined);
const incrementCuenta = (s?: string) => {
  if (!s || !/^\d+$/.test(s)) return s ?? "";
  const len = s.length;
  const num = BigInt(s) + 1n;
  let out = num.toString();
  if (out.length < len) out = out.padStart(len, "0");
  return out;
};
const cuentasDuplicadas = (arr: CuentaRow[]) => {
  const counts = new Map<string, number>();
  for (const r of arr) {
    const key = String(r.cuenta ?? "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, n]) => n > 1)
    .map(([k]) => k)
    .sort((a, b) => a.localeCompare(b));
};

export default function NomenclaturaDetalleEmpresaPage() {
  const router = useRouter();
  const { usuario, id } = useParams<{ usuario: string; id: string }>();

  const [rows, setRows] = useState<CuentaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [expandedRoots, setExpandedRoots] = useState<Record<RootId, boolean>>({
    "1": false, "2": false, "3": false, "4": false, "5": false, "6": false,
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/nomenclaturas/${id}`, {
          cache: "no-store",
          credentials: "include",
        });
        const payload = await res.json();
        if (!res.ok || payload?.ok === false) throw new Error(payload?.error || "GET_FAILED");

        const cab = payload?.data ?? payload ?? {};
        setNombre(String(cab.nombre ?? ""));
        setDescripcion(String(cab.descripcion ?? ""));

        const list: any[] = Array.isArray(cab.cuentas) ? cab.cuentas : [];
        const normalizadas: CuentaRow[] = list.map((r: any, i: number) => ({
          orden: Number(r.orden ?? i + 1),
          cuenta: String(r.cuenta ?? ""),
          descripcion: String(r.descripcion ?? ""),
          debeHaber: toPretty(r.debeHaber || "DEBE") as "DEBE" | "HABER",
          principalDetalle: toPretty(r.principalDetalle || "P") as "P" | "D",
          nivel: Number(r.nivel ?? 1),
          tipo: toPretty(r.tipo || "BALANCE_GENERAL") as Tipo,
          naturaleza: toPretty(r.naturaleza || "REVISAR") as Naturaleza,
          isPlantilla: !!r.isPlantilla,

          lockCuenta: !!r.lockCuenta,
          lockDescripcion: !!r.lockDescripcion,
          lockDebeHaber: !!r.lockDebeHaber,
          lockPrincipalDetalle: !!r.lockPrincipalDetalle,
          lockNivel: !!r.lockNivel,
          lockTipo: !!r.lockTipo,
          lockNaturaleza: !!r.lockNaturaleza,

          lockAdd: typeof r.lockAdd === "boolean" ? r.lockAdd : !!r.lockRowActions,
          lockDelete: typeof r.lockDelete === "boolean" ? r.lockDelete : (r.isPlantilla ? true : !!r.lockRowActions),
        }));

        setRows(reindexRows(normalizadas));
      } catch (e) {
        console.error(e);
        alert("No se pudo cargar la nomenclatura.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const naturalezaOptions = useMemo<Naturaleza[]>(
    () => ["ACTIVO","PASIVO","CAPITAL","INGRESOS","COSTOS","GASTOS","OTROS INGRESOS","OTROS GASTOS","REVISAR"],
    []
  );
  const tipoOptions = useMemo<Tipo[]>(() => ["BALANCE GENERAL", "ESTADO RESULTADOS", "CAPITAL"], []);
  const nivelOptions = [1,2,3,4,5];

  const canAdd = (r: CuentaRow) => {
    if (typeof (r as any).lockAdd === "boolean") return !(r as any).lockAdd;
    if (r.isPlantilla && r.principalDetalle === "P") return false;
    return true;
  };
  const canDelete = (r: CuentaRow) => !(r as any).lockDelete;

  const ensureRootExpandedForRow = (parent: CuentaRow) => {
    const ld = leadingDigit(parent.cuenta);
    if (ld && ROOT_IDS.includes(ld as RootId)) {
      setExpandedRoots(prev => ({ ...prev, [ld as RootId]: true }));
    }
  };

  const addAfter = (r: CuentaRow) => {
    if (!canAdd(r)) return;
    const nextCuenta = incrementCuenta(r.cuenta);
    const parentLeading = leadingDigit(r.cuenta);

    setRows(prev => {
      const idx = prev.findIndex(x => x.orden === r.orden);
      const nueva: any = {
        orden: 999999,
        cuenta: nextCuenta ?? "",
        descripcion: "",
        debeHaber: r.debeHaber,
        principalDetalle: "D",
        nivel: (typeof r.nivel === "number" ? r.nivel : 1),
        tipo: r.tipo ?? "BALANCE GENERAL",
        naturaleza: r.naturaleza ?? "REVISAR",
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

        _leadingRoot: parentLeading,
      };

      const cp = [...prev];
      cp.splice(idx + 1, 0, nueva);
      return reindexRows(cp);
    });

    ensureRootExpandedForRow(r);
  };

  const removeRow = (r: CuentaRow) => {
    if (!canDelete(r)) return;
    setRows(prev => reindexRows(prev.filter(x => x.orden !== r.orden)));
  };

  const visibleRows = useMemo(() => {
    return rows.filter(r => {
      const ld = leadingDigit(r.cuenta) as RootId | undefined;
      if (isRootRow(r)) return true;
      if (!ld || !ROOT_IDS.includes(ld)) return true;
      return expandedRoots[ld];
    });
  }, [rows, expandedRoots]);

  const total = visibleRows.length;
  const last = Math.max(0, Math.ceil(total / pageSize) - 1);
  const start = page * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = visibleRows.slice(start, end);

  const nextPage = () => setPage(p => Math.min(p + 1, last));
  const prevPage = () => setPage(p => Math.max(p - 1, 0));
  useEffect(() => { if (page > last) setPage(last); }, [visibleRows, pageSize]); // eslint-disable-line

  const toggleRoot = (root: RootId) => setExpandedRoots(prev => ({ ...prev, [root]: !prev[root] }));

  const guardarCambios = async () => {
    const dups = cuentasDuplicadas(rows);
    if (dups.length > 0) {
      alert(`Existen cuentas con la misma numeración:\n\n${dups.join(", ")}\n\nCorrige los duplicados antes de guardar.`);
      return;
    }

    const payloadRows = reindexRows(rows).map(r => ({
      ...r,
      debeHaber: toEnumToken(String(r.debeHaber)),
      principalDetalle: toEnumToken(String(r.principalDetalle)),
      tipo: toEnumToken(String(r.tipo)),
      naturaleza: toEnumToken(String(r.naturaleza)),
    }));

    try {
      const res = await fetch(`/api/nomenclaturas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nombre, descripcion, cuentas: payloadRows }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "UPDATE_FAILED");

      alert("Cambios guardados");
      router.push(`/dashboard/empresa/${usuario}/nomenclatura`);
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar");
    }
  };

  const borrarNomenclatura = async () => {
    if (!confirm("¿Seguro que deseas borrar esta nomenclatura?")) return;
    try {
      const res = await fetch(`/api/nomenclaturas/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("DELETE_FAILED");
      alert("Nomenclatura eliminada");
      router.push(`/dashboard/empresa/${usuario}/nomenclatura`);
    } catch (e) {
      console.error(e);
      alert("Error al borrar nomenclatura");
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar role="EMPRESA" usuario={String(usuario)} />

      <main className="flex-1 bg-slate-200">
        <div className="max-w-8xl mx-5 p-6">
          <h1 className="text-3xl font-bold">NOMENCLATURA DETALLES</h1>

          <section className="mt-6 bg-white rounded-xl shadow p-4">
            <h2 className="text-slate-800 font-semibold">Información General:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="text-xs text-slate-500">Nombre</label>
                <input className="w-full mt-1 border rounded-lg px-3 py-2"
                       value={nombre} onChange={(e)=>setNombre(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-500">Descripción</label>
                <input className="w-full mt-1 border rounded-lg px-3 py-2"
                       value={descripcion} onChange={(e)=>setDescripcion(e.target.value)} />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={borrarNomenclatura} className="bg-rose-600 text-white px-4 py-2 rounded">
                Borrar Nomenclatura
              </button>
              <button onClick={guardarCambios} className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
                Guardar Cambios
              </button>
            </div>
          </section>

          <section className="mt-6 bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-slate-700 font-semibold">Cuentas:</h2>

              <div className="flex items-center gap-4">
                <div className="text-sm">
                  Rows per page:{" "}
                  <select className="border rounded px-2 py-1" value={pageSize}
                          onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(0); }}>
                    {[10,15,20,25,30].map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="text-sm">{total===0?"0-0 of 0":`${start+1}-${end} of ${total}`}</div>
                <div className="flex gap-2">
                  <button className="border rounded px-2" onClick={()=>setPage(0)} disabled={page===0}>⏮</button>
                  <button className="border rounded px-2" onClick={prevPage} disabled={page===0}>◀</button>
                  <button className="border rounded px-2" onClick={nextPage} disabled={page===last || total===0}>▶</button>
                  <button className="border rounded px-2" onClick={()=>setPage(last)} disabled={page===last || total===0}>⏭</button>
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
                      <th className="px-3 py-2 text-center">+</th>
                      <th className="px-3 py-2 text-center">🗑</th>
                      <th className="px-3 py-2 text-left">PRINCIPAL/DETALLE</th>
                      <th className="px-3 py-2 text-left">CUENTA</th>
                      <th className="px-3 py-2 text-left">DESCRIPCIÓN</th>
                      <th className="px-3 py-2 text-left">DEBE/HABER</th>
                      <th className="px-3 py-2 text-left">NIVEL</th>
                      <th className="px-3 py-2 text-left">TIPO</th>
                      <th className="px-3 py-2 text-left">NATURALEZA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => {
                      const ld = leadingDigit(r.cuenta) as RootId | undefined;
                      const rowIsGrey = r.isPlantilla && r.principalDetalle === "P";

                      const handleCuentaChange = (val: string) => {
                        const allowedLeading = (r as any)._leadingRoot as string | undefined;
                        if (allowedLeading && val && /^\d/.test(val) && val[0] !== allowedLeading) {
                          alert(`Esa cuenta no pertenece a esta jerarquía. Debe iniciar con "${allowedLeading}".`);
                          return;
                        }
                        setRows(prev => prev.map(x => x.orden === r.orden ? { ...x, cuenta: val } : x));
                      };

                      const isRoot = isRootRow(r) && !!ld && ROOT_IDS.includes(ld as RootId);

                      return (
                        <tr key={r.orden} className={cx("border-b", rowIsGrey && "bg-slate-100")}>
                          <td className="px-3 py-2 text-center">
                            <button
                              className={cx("px-2 py-1 rounded text-white", !canAdd(r)? "bg-slate-300 cursor-not-allowed":"bg-emerald-600")}
                              disabled={!canAdd(r)}
                              onClick={()=>addAfter(r)}
                            >
                              +
                            </button>
                          </td>

                          <td className="px-3 py-2 text-center">
                            <button
                              className={cx("px-2 py-1 rounded text-white", !canDelete(r)? "bg-slate-300 cursor-not-allowed":"bg-rose-600")}
                              disabled={!canDelete(r)}
                              onClick={()=>removeRow(r)}
                            >
                              🗑
                            </button>
                          </td>

                          <td className="px-3 py-2">
                            {isRoot ? (
                              <button
                                className={cx("inline-flex items-center gap-2 text-white px-3 py-1 rounded-full", rootColors[ld!], "shadow-sm")}
                                onClick={() => toggleRoot(ld!)}
                                title={`${expandedRoots[ld!] ? "Ocultar" : "Desplegar"} ${rootLabel[ld!]}`}
                              >
                                <span className="text-xs">{expandedRoots[ld!] ? "▼" : "►"}</span>
                                <span className="font-semibold">{expandedRoots[ld!] ? "Ocultar" : "Desplegar"}</span>
                              </button>
                            ) : (
                              <select
                                className="border rounded px-2 py-1"
                                value={r.principalDetalle}
                                disabled={r.lockPrincipalDetalle}
                                onChange={(e)=>setRows(prev=>prev.map(x=>x.orden===r.orden?{...x,principalDetalle:e.target.value as any}:x))}
                              >
                                <option value="P">P</option>
                                <option value="D">D</option>
                              </select>
                            )}
                          </td>

                          <td className="px-3 py-2">
                            <input
                              className={cx("w-32 border rounded px-2 py-1", (r.lockCuenta || r.principalDetalle==="P") && "bg-slate-200")}
                              value={r.cuenta}
                              disabled={r.lockCuenta || r.principalDetalle==="P"}
                              onChange={(e)=>handleCuentaChange(e.target.value)}
                            />
                          </td>

                          {[
                            ["descripcion", r.lockDescripcion, r.descripcion, "w-64"],
                            ["debeHaber", r.lockDebeHaber, r.debeHaber],
                            ["nivel", r.lockNivel, r.nivel, "w-20"],
                            ["tipo", r.lockTipo, r.tipo],
                            ["naturaleza", r.lockNaturaleza, r.naturaleza],
                          ].map(([field, locked, value, w]) => {
                            const fd = field as "descripcion"|"debeHaber"|"nivel"|"tipo"|"naturaleza";
                            const disabled = r.principalDetalle==="P" ? true : !!locked;

                            if (fd==="descripcion") {
                              return (
                                <td key={fd as string} className={cx("px-3 py-2", disabled && "bg-slate-200")}>
                                  <input
                                    className={`border rounded px-2 py-1 ${w || ""}`}
                                    value={String(value ?? "")}
                                    placeholder="Añade la descripción…"
                                    disabled={disabled}
                                    onChange={(e)=>setRows(prev=>prev.map(x=>x.orden===r.orden?{...x,descripcion:e.target.value}:x))}
                                  />
                                </td>
                              );
                            }
                            if (fd==="debeHaber") {
                              return (
                                <td key={fd as string} className={cx("px-3 py-2", disabled && "bg-slate-200")}>
                                  <select className="border rounded px-2 py-1" value={String(value)} disabled={disabled}
                                          onChange={(e)=>setRows(prev=>prev.map(x=>x.orden===r.orden?{...x,debeHaber:e.target.value as any}:x))}>
                                    <option value="DEBE">DEBE</option>
                                    <option value="HABER">HABER</option>
                                  </select>
                                </td>
                              );
                            }
                            if (fd==="nivel") {
                              return (
                                <td key={fd as string} className={cx("px-3 py-2", disabled && "bg-slate-200")}>
                                  <select className={`border rounded px-2 py-1 ${w || ""}`} value={Number(value)} disabled={disabled}
                                          onChange={(e)=>setRows(prev=>prev.map(x=>x.orden===r.orden?{...x,nivel:Number(e.target.value)}:x))}>
                                    {nivelOptions.map(n=><option key={n} value={n}>{n}</option>)}
                                  </select>
                                </td>
                              );
                            }
                            if (fd==="tipo") {
                              return (
                                <td key={fd as string} className={cx("px-3 py-2", disabled && "bg-slate-200")}>
                                  <select className="border rounded px-2 py-1" value={String(value)} disabled={disabled}
                                          onChange={(e)=>setRows(prev=>prev.map(x=>x.orden===r.orden?{...x,tipo:e.target.value as any}:x))}>
                                    {["BALANCE GENERAL","ESTADO RESULTADOS","CAPITAL"].map(t=><option key={t} value={t}>{t}</option>)}
                                  </select>
                                </td>
                              );
                            }
                            return (
                              <td key={fd as string} className={cx("px-3 py-2", disabled && "bg-slate-200")}>
                                <select className="border rounded px-2 py-1" value={String(value)} disabled={disabled}
                                        onChange={(e)=>setRows(prev=>prev.map(x=>x.orden===r.orden?{...x,naturaleza:e.target.value as any}:x))}>
                                  {naturalezaOptions.map(n=><option key={n} value={n}>{n}</option>)}
                                </select>
                              </td>
                            );
                          })}
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
