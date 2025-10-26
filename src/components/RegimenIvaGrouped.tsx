// src/components/RegimenIvaGrouped.tsx
"use client";

import { useMemo, useState, Fragment } from "react";
import { RegimenIvaFila } from "@/types/regimen-iva";

type Props = {
  rows: RegimenIvaFila[];
  /** "white" (default) deja la fila de grupo en blanco;
   *  "button" la pinta con el mismo color intenso del botón. */
  groupRowColorMode?: "white" | "button";
};

/** Orden EXACTO de grupos */
const NOMBRE_COMUN_ORDER = [
  "Primario",
  "PQ.C",
  "Pecuario",
  "IVA General",
  // otros, si existen, van al final
  "Ventas exentas",
  "Ventas no afectas",
  "Servicios exentos",
  "Exportación",
  "Intermediario",
];

/** 🎨 Colores fuertes de los botones por grupo */
const BTN_COLOR_BY_GROUP: Record<string, { base: string; hover: string; ring: string }> = {
  Primario: { base: "bg-emerald-600", hover: "hover:bg-emerald-700", ring: "focus:ring-emerald-300" },
  "PQ.C": { base: "bg-violet-600", hover: "hover:bg-violet-700", ring: "focus:ring-violet-300" },
  Pecuario: { base: "bg-fuchsia-600", hover: "hover:bg-fuchsia-700", ring: "focus:ring-fuchsia-300" },
  "IVA General": { base: "bg-amber-500", hover: "hover:bg-amber-600", ring: "focus:ring-amber-300" },
  "Ventas exentas": { base: "bg-sky-600", hover: "hover:bg-sky-700", ring: "focus:ring-sky-300" },
  "Ventas no afectas": { base: "bg-rose-600", hover: "hover:bg-rose-700", ring: "focus:ring-rose-300" },
  "Servicios exentos": { base: "bg-teal-600", hover: "hover:bg-teal-700", ring: "focus:ring-teal-300" },
  Exportación: { base: "bg-blue-600", hover: "hover:bg-blue-700", ring: "focus:ring-blue-300" },
  Intermediario: { base: "bg-cyan-600", hover: "hover:bg-cyan-700", ring: "focus:ring-cyan-300" },
};

const groupKey = (r: RegimenIvaFila) => (r.nombreComun || "").trim() || "(Sin grupo)";

export default function RegimenIvaGrouped({ rows, groupRowColorMode = "white" }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const map = new Map<string, RegimenIvaFila[]>();
    for (const r of rows) {
      const k = groupKey(r);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    const entries = Array.from(map.entries()).sort((a, b) => {
      const ia = NOMBRE_COMUN_ORDER.indexOf(a[0]);
      const ib = NOMBRE_COMUN_ORDER.indexOf(b[0]);
      const pa = ia === -1 ? 999 : ia;
      const pb = ib === -1 ? 999 : ib;
      if (pa !== pb) return pa - pb;
      return a[0].localeCompare(b[0]);
    });
    for (const [, list] of entries) {
      list.sort(
        (x, y) =>
          (x.orden ?? 0) - (y.orden ?? 0) ||
          (x.idRegimen ?? 0) - (y.idRegimen ?? 0)
      );
    }
    return entries;
  }, [rows]);

  const toggle = (g: string) => setOpen((prev) => ({ ...prev, [g]: !prev[g] }));

  const btnClass = (g: string) => {
    const pal = BTN_COLOR_BY_GROUP[g] ?? {
      base: "bg-slate-700",
      hover: "hover:bg-slate-800",
      ring: "focus:ring-slate-300",
    };
    return [
      pal.base,
      pal.hover,
      pal.ring,
      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-white font-semibold shadow",
      "transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white",
    ].join(" ");
  };

  const groupRowClass = (g: string) => {
    if (groupRowColorMode === "button") {
      const pal = BTN_COLOR_BY_GROUP[g];
      return `${pal?.base ?? "bg-slate-700"} text-white`;
    }
    return "bg-white text-slate-800";
  };

  return (
    <div className="rounded-xl shadow overflow-x-auto bg-white">
      <table className="min-w-[1400px] w-full text-sm">
        <thead className="bg-slate-900 text-white">
          <tr>
            <th className="px-3 py-2">ID_REGIMEN</th>
            <th className="px-3 py-2">Regimen en sistema</th>
            <th className="px-3 py-2">Nombre del Regimen</th>
            <th className="px-3 py-2">Nombre Común</th>
            <th className="px-3 py-2">Porcentaje Iva</th>
            <th className="px-3 py-2">Periodo</th>
            <th className="px-3 py-2">Presenta anual</th>
            <th className="px-3 py-2">Limite facturacion Salario actual</th>
            <th className="px-3 py-2">Cantidad de Salarios al año</th>
            <th className="px-3 py-2">Limite Facturacion anual</th>
            <th className="px-3 py-2">Lugar de venta</th>
            <th className="px-3 py-2">Tipo de Activida</th>
            <th className="px-3 py-2">OPCION A SER SUJETO Retencio IVA</th>
            <th className="px-3 py-2">Porcentaje de retencion IVA</th>
            <th className="px-3 py-2">Para Monto de retencion Mayor o igual</th>
            <th className="px-3 py-2">OPCION A SER EXENTO IVA</th>
            <th className="px-3 py-2">Presenta facturas</th>
            <th className="px-3 py-2">Retencio de iva</th>
            <th className="px-3 py-2">Retencion de ISR</th>
            <th className="px-3 py-2">Presentan ISO</th>
            <th className="px-3 py-2">Presenta Inventarios</th>
            <th className="px-3 py-2">Libro Compras</th>
            <th className="px-3 py-2">Libro Ventas</th>
            <th className="px-3 py-2">Libro Diario</th>
            <th className="px-3 py-2">Libro Diario Detalle</th>
            <th className="px-3 py-2">Libro Mayor</th>
            <th className="px-3 py-2">Balance General y Estado de Resultados</th>
            <th className="px-3 py-2">Estados Financieros</th>
            <th className="px-3 py-2">Conciliación Bancaria</th>
            <th className="px-3 py-2">Asiento contable</th>
          </tr>
        </thead>

        <tbody>
          {groups.map(([gname, list]) => {
            const opened = !!open[gname];
            return (
              <Fragment key={gname}>
                {/* Fila de grupo */}
                <tr className={`${groupRowClass(gname)} font-semibold`}>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">
                    <button className={btnClass(gname)} onClick={() => toggle(gname)}>
                      <span
                        className={`inline-block transform transition-transform ${opened ? "rotate-90" : ""}`}
                      >
                        ▶
                      </span>
                      {opened ? "Ocultar" : "Desplegar"}
                    </button>
                  </td>
                  {/* celdas vacías que alinean el resto de columnas */}
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2">{gname}</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                </tr>

                {/* Filas del grupo (cuando se despliega) */}
                {opened &&
                  list.map((r) => (
                    <tr key={`${gname}-${r.idRegimen}`} className="border-b">
                      <td className="px-3 py-2">{r.idRegimen}</td>
                      <td className="px-3 py-2">{r.regimenSistema}</td>
                      <td className="px-3 py-2">{r.nombreRegimen}</td>
                      <td className="px-3 py-2">{r.nombreComun}</td>
                      <td className="px-3 py-2 text-right">{Number(r.porcentajeIva)}</td>
                      <td className="px-3 py-2">{r.periodo}</td>
                      <td className="px-3 py-2">{r.presentaAnual}</td>
                      <td className="px-3 py-2 text-right">{Number(r.limiteSalarioActual)}</td>
                      <td className="px-3 py-2 text-right">{Number(r.cantidadSalariosAnio)}</td>
                      <td className="px-3 py-2 text-right">{Number(r.limiteFacturacionAnual)}</td>
                      <td className="px-3 py-2">{r.lugarVenta}</td>
                      <td className="px-3 py-2">{r.tipoActividad}</td>
                      <td className="px-3 py-2">{r.opcionSujetoRetencionIva}</td>
                      <td className="px-3 py-2 text-right">{Number(r.porcentajeRetencionIva)}</td>
                      <td className="px-3 py-2 text-right">{Number(r.montoRetencionMayorIgual)}</td>
                      <td className="px-3 py-2">{r.opcionExentoIva}</td>
                      <td className="px-3 py-2">{r.presentaFacturas}</td>
                      <td className="px-3 py-2">{r.retencionIva}</td>
                      <td className="px-3 py-2">{r.retencionIsr}</td>
                      <td className="px-3 py-2">{r.presentanIso}</td>
                      <td className="px-3 py-2">{r.presentaInventarios}</td>
                      <td className="px-3 py-2">{r.libroCompras}</td>
                      <td className="px-3 py-2">{r.libroVentas}</td>
                      <td className="px-3 py-2">{r.libroDiario}</td>
                      <td className="px-3 py-2">{r.libroDiarioDetalle}</td>
                      <td className="px-3 py-2">{r.libroMayor}</td>
                      <td className="px-3 py-2">{r.balanceGeneralEstadoResult}</td>
                      <td className="px-3 py-2">{r.estadosFinancieros}</td>
                      <td className="px-3 py-2">{r.conciliacionBancaria}</td>
                      <td className="px-3 py-2">{r.asientoContable}</td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
