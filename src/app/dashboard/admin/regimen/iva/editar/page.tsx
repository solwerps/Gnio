"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

/** Ajusta este tipo si tu backend usa nombres distintos */
export type RegimenIvaFila = {
  /** ID_REGIMEN (solo lectura para filas de semilla; editable para nuevas) */
  idRegimen: number;
  /** flags para control UI */
  isSeed?: boolean;        // viene de semilla/DB bloqueada para borrar
  lockDelete?: boolean;    // si true, no se puede borrar
  lockAdd?: boolean;       // si true, no se puede agregar debajo

  // === Campos “catálogo IVA” (vista 10.png) ===
  regimenSistema: string;
  nombreRegimen: string;
  nombreComun: string;
  porcentajeIva: number; // guardar como número, sin “%”
  periodo: "Mensual" | "Trimestral" | "Anual";

  // === Campos “periodo / presenta / limites / lugar venta” (vista 11.png) ===
  presentaAnual: "SI" | "NO";
  limiteSalarioActual: number;
  cantidadSalariosAnio: number;
  limiteFacturacionAnual: number; // calculado (limiteSalarioActual * cantidadSalariosAnio)
  lugarVenta: string; // Local / Exportación / Intermediario / etc

  // === Campos “retenciones / libros / estados” (vista 12.png) ===
  presentaFacturas: "SI" | "NO";
  retencionIva: "SI" | "NO";
  retencionIsr: "SI" | "NO";
  presentanIso: "SI" | "NO";
  presentaInventarios: "SI" | "NO";
  libroCompras: "SI" | "NO";
  libroVentas: "SI" | "NO";
  libroDiario: "SI" | "NO";
  libroDiarioDetalle: "SI" | "NO";
  libroMayor: "SI" | "NO";
  balanceGeneralER: "SI" | "NO";
  estadosFinancieros: "SI" | "NO";
  conciliacionBancaria: "SI" | "NO";
  asientoContable: "SI" | "NO";
};

const yesNo: Array<"SI" | "NO"> = ["SI", "NO"];
const periodos: Array<"Mensual" | "Trimestral" | "Anual"> = [
  "Mensual",
  "Trimestral",
  "Anual",
];
const lugaresVenta = [
  "Local",
  "Exportación",
  "Intermediario",
  "Local Ventas / Servicios",
] as const;

// helpers
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const reindexIds = (arr: RegimenIvaFila[]) =>
  arr.map((r, i) => ({ ...r, idRegimen: i + 1 }));

export default function EditarRegimenIvaPage() {
  const router = useRouter();
  const [rows, setRows] = useState<RegimenIvaFila[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // carga
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/regimen/iva", { cache: "no-store" });
      const json = await res.json();

      // normaliza: asegúrate de mapear los nombres reales que devuelva tu API
      const data: RegimenIvaFila[] = (json?.data ?? []).map((r: any, i: number) => {
        const limite = Number(r.limiteSalarioActual ?? r.limite_facturacion_salario ?? 0) *
                       Number(r.cantidadSalariosAnio ?? r.cantidad_salarios ?? 0);

        return {
          idRegimen: Number(r.idRegimen ?? r.id_regimen ?? i + 1),
          isSeed: !!r.isSeed,
          lockAdd: r.lockAdd ?? false,
          lockDelete: typeof r.lockDelete === "boolean" ? r.lockDelete : !!r.isSeed,

          regimenSistema: String(r.regimenSistema ?? r.regimen_sistema ?? ""),
          nombreRegimen: String(r.nombreRegimen ?? r.nombre_regimen ?? ""),
          nombreComun: String(r.nombreComun ?? r.nombre_comun ?? ""),
          porcentajeIva: Number(r.porcentajeIva ?? r.porcentaje_iva ?? 0),
          periodo: (r.periodo ?? r.periodo_frecuencia ?? "Mensual") as any,

          presentaAnual: (r.presentaAnual ?? r.presenta_anual ?? "SI") as any,
          limiteSalarioActual: Number(r.limiteSalarioActual ?? r.limite_salario ?? 0),
          cantidadSalariosAnio: Number(r.cantidadSalariosAnio ?? r.cantidad_salarios ?? 0),
          limiteFacturacionAnual:
            Number(r.limiteFacturacionAnual ?? r.limite_facturacion_anual ?? limite),
          lugarVenta: String(r.lugarVenta ?? r.lugar_venta ?? "Local"),

          presentaFacturas: (r.presentaFacturas ?? "SI") as any,
          retencionIva: (r.retencionIva ?? "SI") as any,
          retencionIsr: (r.retencionIsr ?? "SI") as any,
          presentanIso: (r.presentanIso ?? "SI") as any,
          presentaInventarios: (r.presentaInventarios ?? "SI") as any,
          libroCompras: (r.libroCompras ?? "SI") as any,
          libroVentas: (r.libroVentas ?? "SI") as any,
          libroDiario: (r.libroDiario ?? "SI") as any,
          libroDiarioDetalle: (r.libroDiarioDetalle ?? "SI") as any,
          libroMayor: (r.libroMayor ?? "SI") as any,
          balanceGeneralER: (r.balanceGeneralER ?? "SI") as any,
          estadosFinancieros: (r.estadosFinancieros ?? "SI") as any,
          conciliacionBancaria: (r.conciliacionBancaria ?? "SI") as any,
          asientoContable: (r.asientoContable ?? "SI") as any,
        };
      });

      setRows(reindexIds(data));
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // cambia campos
  const setCell = <K extends keyof RegimenIvaFila>(
    r: RegimenIvaFila,
    key: K,
    val: RegimenIvaFila[K]
  ) => {
    setRows((prev) =>
      prev.map((x) => {
        if (x.idRegimen !== r.idRegimen) return x;

        const next: RegimenIvaFila = { ...x, [key]: val } as any;

        // Si cambian salarios, recalcular límite anual
        if (key === "limiteSalarioActual" || key === "cantidadSalariosAnio") {
          const a = Number(
            key === "limiteSalarioActual" ? val : next.limiteSalarioActual
          );
          const b = Number(
            key === "cantidadSalariosAnio" ? val : next.cantidadSalariosAnio
          );
          next.limiteFacturacionAnual = a * b;
        }

        return next;
      })
    );
  };

  // agregar debajo (copia del r actual)
  const addAfter = (r: RegimenIvaFila) => {
    if (r.lockAdd) return;
    setRows((prev) => {
      const idx = prev.findIndex((x) => x.idRegimen === r.idRegimen);
      const clone: RegimenIvaFila = {
        ...r,
        idRegimen: 999999,      // temporal; luego reindex
        isSeed: false,
        lockDelete: false,
        lockAdd: false,
      };
      const cp = [...prev];
      cp.splice(idx + 1, 0, clone);
      return reindexIds(cp);
    });
  };

  // borrar (solo si no es de semilla / lockDelete=false)
  const removeRow = (r: RegimenIvaFila) => {
    if (r.lockDelete || r.isSeed) return;
    setRows((prev) => reindexIds(prev.filter((x) => x.idRegimen !== r.idRegimen)));
  };

  // guardar
  const guardar = async () => {
    try {
      setSaving(true);
      // payload directo (ajusta keys si tu route PUT espera otros nombres)
      const payload = rows.map((r) => ({
        idRegimen: r.idRegimen,
        isSeed: !!r.isSeed,
        lockAdd: !!r.lockAdd,
        lockDelete: !!r.lockDelete,

        regimenSistema: r.regimenSistema,
        nombreRegimen: r.nombreRegimen,
        nombreComun: r.nombreComun,
        porcentajeIva: Number(r.porcentajeIva),
        periodo: r.periodo,

        presentaAnual: r.presentaAnual,
        limiteSalarioActual: Number(r.limiteSalarioActual),
        cantidadSalariosAnio: Number(r.cantidadSalariosAnio),
        limiteFacturacionAnual: Number(r.limiteFacturacionAnual),
        lugarVenta: r.lugarVenta,

        presentaFacturas: r.presentaFacturas,
        retencionIva: r.retencionIva,
        retencionIsr: r.retencionIsr,
        presentanIso: r.presentanIso,
        presentaInventarios: r.presentaInventarios,
        libroCompras: r.libroCompras,
        libroVentas: r.libroVentas,
        libroDiario: r.libroDiario,
        libroDiarioDetalle: r.libroDiarioDetalle,
        libroMayor: r.libroMayor,
        balanceGeneralER: r.balanceGeneralER,
        estadosFinancieros: r.estadosFinancieros,
        conciliacionBancaria: r.conciliacionBancaria,
        asientoContable: r.asientoContable,
      }));

      const res = await fetch("/api/regimen/iva", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filas: payload }),
      });

      if (!res.ok) throw new Error("PUT failed");
      alert("Régimen IVA guardado.");
      router.push("/dashboard/admin/regimen/iva");
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  // restablecer semilla
  const reset = async () => {
    if (
      !confirm(
        "¿Restablecer a valores de fábrica (semilla)? Esto reemplazará tu configuración actual."
      )
    )
      return;

    try {
      setResetting(true);
      const res = await fetch("/api/regimen/iva", { method: "DELETE" });
      if (!res.ok) throw new Error("DELETE failed");
      await load();
      alert("Régimen restablecido a semilla.");
    } catch (e) {
      console.error(e);
      alert("No se pudo restablecer.");
    } finally {
      setResetting(false);
    }
  };

  // === UI de tabla única (campos clave) ===
  // (Si quieres 3 secciones visuales como tus imágenes 9/10/11/12, divide la tabla
  // en subtabs; la lógica de edición/guardar es exactamente la misma.)
  return (
    <div className="min-h-screen flex">
      <Sidebar role="ADMIN" />

      <main className="flex-1 bg-slate-100">
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-4xl font-extrabold mb-6">Régimen IVA / Editar</h1>

          <div className="mb-4 flex gap-3">
            <button
              onClick={reset}
              disabled={resetting || loading}
              className={cx(
                "px-4 py-2 rounded text-white",
                resetting || loading ? "bg-rose-300" : "bg-rose-600 hover:bg-rose-700"
              )}
            >
              {resetting ? "Restableciendo…" : "Restablecer Régimen"}
            </button>

            <button
              onClick={guardar}
              disabled={saving || loading}
              className={cx(
                "px-4 py-2 rounded text-white",
                saving || loading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {saving ? "Guardando…" : "Guardar Régimen"}
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl bg-white shadow p-6 text-slate-500">
              Cargando semilla/DB…
            </div>
          ) : (
            <div className="rounded-xl bg-white shadow overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-2 py-2 text-left">ID_REGIMEN</th>
                    <th className="px-2 py-2 text-left">Regimen en sistema</th>
                    <th className="px-2 py-2 text-left">Nombre del Régimen</th>
                    <th className="px-2 py-2 text-left">Nombre Común</th>
                    <th className="px-2 py-2 text-left">Porcentaje IVA</th>
                    <th className="px-2 py-2 text-left">Periodo</th>

                    <th className="px-2 py-2 text-left">Presenta anual</th>
                    <th className="px-2 py-2 text-left">Límite Salario</th>
                    <th className="px-2 py-2 text-left">#Salarios/año</th>
                    <th className="px-2 py-2 text-left">Límite Facturación</th>
                    <th className="px-2 py-2 text-left">Lugar venta</th>

                    <th className="px-2 py-2 text-left">Facturas</th>
                    <th className="px-2 py-2 text-left">Ret. IVA</th>
                    <th className="px-2 py-2 text-left">Ret. ISR</th>
                    <th className="px-2 py-2 text-left">ISO</th>
                    <th className="px-2 py-2 text-left">Inventarios</th>
                    <th className="px-2 py-2 text-left">Lib. Compras</th>
                    <th className="px-2 py-2 text-left">Lib. Ventas</th>
                    <th className="px-2 py-2 text-left">Lib. Diario</th>
                    <th className="px-2 py-2 text-left">Diario Det.</th>
                    <th className="px-2 py-2 text-left">Mayor</th>
                    <th className="px-2 py-2 text-left">BG y ER</th>
                    <th className="px-2 py-2 text-left">Estados Fin.</th>
                    <th className="px-2 py-2 text-left">Conc. Bancaria</th>
                    <th className="px-2 py-2 text-left">Asiento</th>

                    <th className="px-2 py-2 text-center">+</th>
                    <th className="px-2 py-2 text-center">🗑</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.idRegimen} className="border-b">
                      {/* ID solo lectura si es de semilla; editable si fue creado por usuario */}
                      <td className="px-2 py-1">
                        <input
                          className="w-20 border rounded px-2 py-1"
                          type="number"
                          value={r.idRegimen}
                          disabled={r.isSeed}
                          onChange={(e) =>
                            setCell(r, "idRegimen", Number(e.target.value) || 0)
                          }
                        />
                      </td>

                      <td className="px-2 py-1">
                        <input
                          className="w-64 border rounded px-2 py-1"
                          value={r.regimenSistema}
                          onChange={(e) => setCell(r, "regimenSistema", e.target.value)}
                        />
                      </td>

                      <td className="px-2 py-1">
                        <input
                          className="w-64 border rounded px-2 py-1"
                          value={r.nombreRegimen}
                          onChange={(e) => setCell(r, "nombreRegimen", e.target.value)}
                        />
                      </td>

                      <td className="px-2 py-1">
                        <input
                          className="w-48 border rounded px-2 py-1"
                          value={r.nombreComun}
                          onChange={(e) => setCell(r, "nombreComun", e.target.value)}
                        />
                      </td>

                      <td className="px-2 py-1">
                        <input
                          className="w-24 border rounded px-2 py-1"
                          type="number"
                          step="0.01"
                          value={r.porcentajeIva}
                          onChange={(e) =>
                            setCell(r, "porcentajeIva", Number(e.target.value) || 0)
                          }
                        />
                      </td>

                      <td className="px-2 py-1">
                        <select
                          className="border rounded px-2 py-1"
                          value={r.periodo}
                          onChange={(e) =>
                            setCell(r, "periodo", e.target.value as RegimenIvaFila["periodo"])
                          }
                        >
                          {periodos.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* bloque periodo/limites/lugar */}
                      <td className="px-2 py-1">
                        <select
                          className="border rounded px-2 py-1"
                          value={r.presentaAnual}
                          onChange={(e) =>
                            setCell(r, "presentaAnual", e.target.value as any)
                          }
                        >
                          {yesNo.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-2 py-1">
                        <input
                          className="w-28 border rounded px-2 py-1"
                          type="number"
                          step="0.01"
                          value={r.limiteSalarioActual}
                          onChange={(e) =>
                            setCell(
                              r,
                              "limiteSalarioActual",
                              Number(e.target.value) || 0
                            )
                          }
                        />
                      </td>

                      <td className="px-2 py-1">
                        <input
                          className="w-24 border rounded px-2 py-1"
                          type="number"
                          value={r.cantidadSalariosAnio}
                          onChange={(e) =>
                            setCell(
                              r,
                              "cantidadSalariosAnio",
                              Number(e.target.value) || 0
                            )
                          }
                        />
                      </td>

                      <td className="px-2 py-1">
                        <input
                          className="w-28 border rounded px-2 py-1 bg-slate-100"
                          type="number"
                          value={r.limiteFacturacionAnual}
                          disabled
                          readOnly
                        />
                      </td>

                      <td className="px-2 py-1">
                        <select
                          className="border rounded px-2 py-1"
                          value={r.lugarVenta}
                          onChange={(e) => setCell(r, "lugarVenta", e.target.value)}
                        >
                          {lugaresVenta.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* bloque permisos/obligaciones */}
                      {([
                        "presentaFacturas",
                        "retencionIva",
                        "retencionIsr",
                        "presentanIso",
                        "presentaInventarios",
                        "libroCompras",
                        "libroVentas",
                        "libroDiario",
                        "libroDiarioDetalle",
                        "libroMayor",
                        "balanceGeneralER",
                        "estadosFinancieros",
                        "conciliacionBancaria",
                        "asientoContable",
                      ] as Array<keyof RegimenIvaFila>).map((k) => (
                        <td className="px-2 py-1" key={k}>
                          <select
                            className="border rounded px-2 py-1"
                            value={rows[idx][k] as any}
                            onChange={(e) =>
                              setCell(r, k, e.target.value as "SI" | "NO")
                            }
                          >
                            {yesNo.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </td>
                      ))}

                      {/* acciones */}
                      <td className="px-2 py-1 text-center">
                        <button
                          className={cx(
                            "px-2 py-1 rounded text-white",
                            r.lockAdd
                              ? "bg-slate-300 cursor-not-allowed"
                              : "bg-emerald-600 hover:bg-emerald-700"
                          )}
                          disabled={r.lockAdd}
                          onClick={() => addAfter(r)}
                          title="Agregar debajo"
                        >
                          +
                        </button>
                      </td>

                      <td className="px-2 py-1 text-center">
                        <button
                          className={cx(
                            "px-2 py-1 rounded text-white",
                            r.lockDelete || r.isSeed
                              ? "bg-slate-300 cursor-not-allowed"
                              : "bg-rose-600 hover:bg-rose-700"
                          )}
                          disabled={r.lockDelete || r.isSeed}
                          onClick={() => removeRow(r)}
                          title={
                            r.lockDelete || r.isSeed
                              ? "No se puede borrar (semilla)"
                              : "Borrar fila"
                          }
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
        </div>
      </main>
    </div>
  );
} 
