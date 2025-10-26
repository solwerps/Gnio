// src/components/empresas/AfiliacionesTab.tsx
"use client";

import { Field, Input, Select } from "./ui";
import { NomenclaturaOption, ObligacionRow, RegimenOption } from "@/types/empresas";
import { useMemo, useState } from "react";

type Props = {
  regimenIvaList: RegimenOption[];
  regimenIsrList: RegimenOption[];
  nomenList: NomenclaturaOption[];

  regimenIvaId?: number;
  setRegimenIvaId: (n?: number)=>void;
  regimenIsrId?: number;
  setRegimenIsrId: (n?: number)=>void;
  nomenclaturaId?: number;
  setNomenclaturaId: (n?: number)=>void;

  obligaciones: ObligacionRow[];
  setObligaciones: (f: any)=>void;

  // para el botón de recarga
  onReloadLists?: () => void;
};

const IMPUESTO_OPTIONS = ["IVA","ISR","ISO","Otro"];

function formatDDMMYYYY(raw: string) {
  // deja sólo números
  const n = raw.replace(/\D/g, "").slice(0, 8);
  const p1 = n.slice(0, 2);
  const p2 = n.slice(2, 4);
  const p3 = n.slice(4, 8);
  let out = p1;
  if (p2) out += "/" + p2;
  if (p3) out += "/" + p3;
  return out;
}
function isValidDDMMYYYY(s: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return false;
  const d = Number(m[1]), mo = Number(m[2]) - 1, y = Number(m[3]);
  const dt = new Date(y, mo, d);
  return dt.getFullYear()===y && dt.getMonth()===mo && dt.getDate()===d;
}

export default function AfiliacionesTab({
  Field: _F, Select: _S, Input: _I, // compat API anterior
  regimenIvaList, regimenIsrList, nomenList,
  regimenIvaId, setRegimenIvaId, regimenIsrId, setRegimenIsrId,
  nomenclaturaId, setNomenclaturaId, obligaciones, setObligaciones,
  onReloadLists,
}: Props & any) {

  // modo edición para el nombre del impuesto (por fila)
  const [editImpuesto, setEditImpuesto] = useState<Record<string, boolean>>({});

  const setRow = (id: string, patch: Partial<ObligacionRow>) =>
    setObligaciones((rows: ObligacionRow[]) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );

  const addRow = () =>
    setObligaciones((r: ObligacionRow[]) => [
      ...r,
      { id: crypto.randomUUID(), impuesto: "Otro" },
    ]);

  const delRow = (id: string) =>
    setObligaciones((r: ObligacionRow[]) => r.filter((x) => x.id !== id));

  const ivaOptions = useMemo(()=> regimenIvaList ?? [], [regimenIvaList]);
  const isrOptions = useMemo(()=> regimenIsrList ?? [], [regimenIsrList]);
  const nomOptions = useMemo(()=> nomenList ?? [], [nomenList]);

  return (
    <div className="space-y-8">
      {/* ===== Selecciones principales: un campo por línea ===== */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm text-neutral-600">Seleccionar Régimen IVA:</label>
            {onReloadLists && (
              <button
                type="button"
                onClick={onReloadLists}
                className="text-xs px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-100"
                title="Recargar listas (IVA, ISR y Nomenclaturas)"
              >
                🔄 Recargar
              </button>
            )}
          </div>
          <Select
            className="w-full"
            value={String(regimenIvaId || "")}
            onChange={(e)=>setRegimenIvaId(Number(e.target.value)||undefined)}
          >
            <option value="">Selecciona</option>
            {ivaOptions.map((r)=> <option key={r.id} value={r.id}>{r.regimenSistema}</option>)}
          </Select>
        </div>

        <div>
          <label className="block text-sm text-neutral-600 mb-1">Seleccionar Régimen ISR:</label>
          <Select
            className="w-full"
            value={String(regimenIsrId || "")}
            onChange={(e)=>setRegimenIsrId(Number(e.target.value)||undefined)}
          >
            <option value="">Selecciona</option>
            {isrOptions.map((r)=> <option key={r.id} value={r.id}>{r.regimenSistema}</option>)}
          </Select>
        </div>

        <div>
          <label className="block text-sm text-neutral-600 mb-1">Seleccionar Nomenclatura:</label>
          <Select
            className="w-full"
            value={String(nomenclaturaId || "")}
            onChange={(e)=>setNomenclaturaId(Number(e.target.value)||undefined)}
          >
            <option value="">{nomOptions.length ? "Selecciona" : "No hay nomenclaturas"}</option>
            {nomOptions.map((n)=> <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </Select>
        </div>
      </div>

      {/* ===== Obligaciones ===== */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Obligaciones en formularios</h3>
        <div className="rounded-xl overflow-hidden border border-neutral-200">
          <table className="w-full text-left">
            <thead className="bg-neutral-900 text-white">
              <tr>
                <th className="px-3 py-2 w-[70px]">añadir</th>
                <th className="px-3 py-2 w-[70px]">Borrar</th>
                <th className="px-3 py-2 w-[200px]">Impuesto</th>
                <th className="px-3 py-2">Código de formulario</th>
                <th className="px-3 py-2 w-[220px]">Fecha de presentación</th>
                <th className="px-3 py-2">Nombre de la obligación</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {obligaciones.map((row)=>(
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <button onClick={addRow} className="rounded-full w-8 h-8 inline-flex items-center justify-center bg-blue-100 text-blue-700">+</button>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={()=>delRow(row.id)} className="rounded-full w-8 h-8 inline-flex items-center justify-center bg-red-100 text-red-700">🗑</button>
                  </td>

                  {/* Impuesto: select <-> editable */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {editImpuesto[row.id] ? (
                        <>
                          <input
                            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5"
                            value={row.impuesto || ""}
                            onChange={(e)=>setRow(row.id,{ impuesto: e.target.value })}
                            placeholder="Nombre del impuesto"
                          />
                          <button
                            type="button"
                            className="text-sm px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-100"
                            title="Volver a seleccionar"
                            onClick={()=>setEditImpuesto((m)=>({ ...m, [row.id]: false }))}
                          >
                            ⬇︎
                          </button>
                        </>
                      ) : (
                        <>
                          <select
                            value={row.impuesto}
                            onChange={(e)=>setRow(row.id,{ impuesto: e.target.value })}
                            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5"
                          >
                            {IMPUESTO_OPTIONS.map((i)=><option key={i} value={i}>{i}</option>)}
                          </select>
                          <button
                            type="button"
                            className="text-sm px-2 py-1 rounded border border-neutral-300 hover:bg-neutral-100"
                            title="Editar nombre"
                            onClick={()=>setEditImpuesto((m)=>({ ...m, [row.id]: true }))}
                          >
                            ✎
                          </button>
                        </>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={row.codigoFormulario||""}
                      onChange={(e)=>setRow(row.id,{ codigoFormulario:e.target.value })}
                      className="w-full rounded-lg border border-neutral-300 px-2 py-1.5"
                    />
                  </td>

                  {/* Fecha dd/mm/aaaa con autoformato */}
                  <td className="px-3 py-2">
                    <input
                      inputMode="numeric"
                      placeholder="dd/mm/aaaa"
                      value={row.fechaPresentacion || ""}
                      onChange={(e)=>{
                        const f = formatDDMMYYYY(e.target.value);
                        setRow(row.id,{ fechaPresentacion: f });
                      }}
                      onBlur={(e)=>{
                        const v = e.target.value.trim();
                        if (v && !isValidDDMMYYYY(v)) {
                          alert("Fecha inválida. Usa el formato dd/mm/aaaa.");
                          setRow(row.id,{ fechaPresentacion: "" });
                        }
                      }}
                      className="w-full rounded-lg border border-neutral-300 px-2 py-1.5"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={row.nombreObligacion||""}
                      onChange={(e)=>setRow(row.id,{ nombreObligacion:e.target.value })}
                      className="w-full rounded-lg border border-neutral-300 px-2 py-1.5"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
