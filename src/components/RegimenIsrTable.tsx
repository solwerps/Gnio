"use client";

import { useMemo } from "react";
import {
  RegimenIsrFila,
  SI_NO,
  PERIODOS,
  LUGAR_VENTA,
  TIPO_ACTIVIDAD,
  OPCION_SUJETO_RET_ISR,
} from "@/types/regimen-isr";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const numberOrZero = (v: any) => (isNaN(Number(v)) ? 0 : Number(v));

type Props = {
  rows: RegimenIsrFila[];
  setRows?: (rows: RegimenIsrFila[]) => void;
  editable?: boolean;
};

export default function RegimenIsrTable({ rows, setRows, editable }: Props) {
  const canEdit = !!setRows && !!editable;

  const update = (orden: number, patch: Partial<RegimenIsrFila>) => {
    if (!canEdit) return;

    setRows!(
      rows.map((r) =>
        r.orden === orden
          ? {
              ...r,
              ...patch,
              // recálculo automático
              limiteFacturacionAnual:
                patch.limiteSalarioActual !== undefined || patch.cantidadSalariosAnio !== undefined
                  ? numberOrZero(patch.limiteSalarioActual ?? r.limiteSalarioActual) *
                    numberOrZero(patch.cantidadSalariosAnio ?? r.cantidadSalariosAnio)
                  : r.limiteFacturacionAnual,
            }
          : r
      )
    );
  };

  const addAfter = (orden: number) => {
    if (!canEdit) return;
    const idx = rows.findIndex((x) => x.orden === orden);
    const above = rows[idx];
    const nextIdRegimen = Math.max(...rows.map((r) => r.idRegimen)) + 1;

    const nuevo: RegimenIsrFila = {
      ...above,
      id: undefined,
      isSeed: false,
      idRegimen: nextIdRegimen,
      orden: 999999,
    };

    const cp = [...rows];
    cp.splice(idx + 1, 0, nuevo);
    setRows!(cp.map((r, i) => ({ ...r, orden: i + 1 })));
  };

  const removeRow = (orden: number) => {
    if (!canEdit) return;
    const r = rows.find((x) => x.orden === orden);
    if (r?.isSeed) return;
    const cp = rows.filter((x) => x.orden !== orden).map((x, i) => ({ ...x, orden: i + 1 }));
    setRows!(cp);
  };

  const header = useMemo(() => {
    const left = [
      "ID_REGIMEN",
      ...(canEdit ? ["+", "🗑"] : []),
      "Regimen en sistema",
      "Nombre del Régimen",
      "Nombre Común",
      "Porcentaje ISR",
      "Para ISR de",
      "Hasta ISR de",
      "Periodo",
      "Presenta anual",
      "Límite salario actual",
      "Salarios al año",
      "Límite facturación anual",
      "Lugar de venta",
      "Tipo de Actividad",
      "Sujeto Retención ISR",
    ];
    const tail = [
      "Facturas",
      "Ret. IVA",
      "Ret. ISR",
      "ISO",
      "Inv.",
      "LC",
      "LV",
      "LD",
      "LDD",
      "LM",
      "BG/ER",
      "EF",
      "Conc.",
      "Asiento",
    ];
    return [...left, ...tail];
  }, [canEdit]);

  return (
    <div className="overflow-x-auto rounded-xl shadow">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900 text-white sticky top-0">
          <tr>
            {header.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.orden} className="border-b">
              {/* ID */}
              <td className="px-3 py-2 w-24">
                <input className="w-full border rounded px-2 py-1 bg-slate-200" value={r.idRegimen} disabled />
              </td>

              {/* Acciones */}
              {canEdit && (
                <>
                  <td className="px-3 py-2 text-center">
                    <button
                      className="px-2 py-1 rounded text-white bg-emerald-600"
                      onClick={() => addAfter(r.orden)}
                      title="Agregar debajo"
                    >
                      +
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      className={cx(
                        "px-2 py-1 rounded text-white",
                        r.isSeed ? "bg-slate-300 cursor-not-allowed" : "bg-rose-600"
                      )}
                      onClick={() => removeRow(r.orden)}
                      disabled={!!r.isSeed}
                      title={r.isSeed ? "No se puede borrar (semilla)" : "Borrar fila"}
                    >
                      🗑
                    </button>
                  </td>
                </>
              )}

              {/* Campos principales */}
              <td className="px-3 py-2 min-w-[320px]">
                <input
                  className={cx("w-full border rounded px-2 py-1", !canEdit && "bg-slate-200")}
                  value={r.regimenSistema}
                  onChange={(e) => update(r.orden, { regimenSistema: e.target.value })}
                  disabled={!canEdit}
                />
              </td>
              <td className="px-3 py-2 min-w-[260px]">
                <input
                  className={cx("w-full border rounded px-2 py-1", !canEdit && "bg-slate-200")}
                  value={r.nombreRegimen}
                  onChange={(e) => update(r.orden, { nombreRegimen: e.target.value })}
                  disabled={!canEdit}
                />
              </td>
              <td className="px-3 py-2 min-w-[160px]">
                <input
                  className={cx("w-full border rounded px-2 py-1", !canEdit && "bg-slate-200")}
                  value={r.nombreComun}
                  onChange={(e) => update(r.orden, { nombreComun: e.target.value })}
                  disabled={!canEdit}
                />
              </td>

              {/* ISR */}
              <td className="px-3 py-2 w-28">
                <input
                  type="number"
                  className={cx("w-full border rounded px-2 py-1 text-right", !canEdit && "bg-slate-200")}
                  value={r.porcentajeIsr}
                  onChange={(e) => update(r.orden, { porcentajeIsr: numberOrZero(e.target.value) })}
                  disabled={!canEdit}
                />
              </td>
              <td className="px-3 py-2 w-32">
                <input
                  type="number"
                  className={cx("w-full border rounded px-2 py-1 text-right", !canEdit && "bg-slate-200")}
                  value={r.paraIsrDe}
                  onChange={(e) => update(r.orden, { paraIsrDe: numberOrZero(e.target.value) })}
                  disabled={!canEdit}
                />
              </td>
              <td className="px-3 py-2 w-32">
                <input
                  type="number"
                  className={cx("w-full border rounded px-2 py-1 text-right", !canEdit && "bg-slate-200")}
                  value={r.hastaIsrDe}
                  onChange={(e) => update(r.orden, { hastaIsrDe: numberOrZero(e.target.value) })}
                  disabled={!canEdit}
                />
              </td>

              {/* Periodo / anual */}
              <td className="px-3 py-2 w-36">
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={r.periodo}
                  onChange={(e) => update(r.orden, { periodo: e.target.value as any })}
                  disabled={!canEdit}
                >
                  {PERIODOS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2 w-28">
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={r.presentaAnual}
                  onChange={(e) => update(r.orden, { presentaAnual: e.target.value as any })}
                  disabled={!canEdit}
                >
                  {SI_NO.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </td>

              {/* Límites */}
              <td className="px-3 py-2 w-40">
                <input
                  type="number"
                  className={cx("w-full border rounded px-2 py-1 text-right", !canEdit && "bg-slate-200")}
                  value={r.limiteSalarioActual}
                  onChange={(e) => update(r.orden, { limiteSalarioActual: numberOrZero(e.target.value) })}
                  disabled={!canEdit}
                />
              </td>
              <td className="px-3 py-2 w-40">
                <input
                  type="number"
                  className={cx("w-full border rounded px-2 py-1 text-right", !canEdit && "bg-slate-200")}
                  value={r.cantidadSalariosAnio}
                  onChange={(e) => update(r.orden, { cantidadSalariosAnio: numberOrZero(e.target.value) })}
                  disabled={!canEdit}
                />
              </td>
              <td className="px-3 py-2 w-44">
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-right bg-slate-200"
                  value={r.limiteFacturacionAnual}
                  disabled
                />
              </td>

              {/* Clasificaciones */}
              <td className="px-3 py-2 w-36">
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={r.lugarVenta}
                  onChange={(e) => update(r.orden, { lugarVenta: e.target.value })}
                  disabled={!canEdit}
                >
                  {LUGAR_VENTA.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2 min-w-[280px]">
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={r.tipoActividad}
                  onChange={(e) => update(r.orden, { tipoActividad: e.target.value })}
                  disabled={!canEdit}
                >
                  {TIPO_ACTIVIDAD.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2 min-w-[220px]">
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={r.opcionSujetoRetencionIsr}
                  onChange={(e) => update(r.orden, { opcionSujetoRetencionIsr: e.target.value })}
                  disabled={!canEdit}
                >
                  {OPCION_SUJETO_RET_ISR.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </td>

              {/* SI/NO masivos */}
              {(
                [
                  ["presentaFacturas"],
                  ["retencionIva"],
                  ["retencionIsr"],
                  ["presentanIso"],
                  ["presentaInventarios"],
                  ["libroCompras"],
                  ["libroVentas"],
                  ["libroDiario"],
                  ["libroDiarioDetalle"],
                  ["libroMayor"],
                  ["balanceGeneralEstadoResult"],
                  ["estadosFinancieros"],
                  ["conciliacionBancaria"],
                  ["asientoContable"],
                ] as const
              ).map(([key]) => (
                <td key={key} className="px-3 py-2 w-28">
                  <select
                    className="border rounded px-2 py-1 w-full"
                    value={(r as any)[key]}
                    onChange={(e) => update(r.orden, { [key]: e.target.value } as any)}
                    disabled={!canEdit}
                  >
                    {SI_NO.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
