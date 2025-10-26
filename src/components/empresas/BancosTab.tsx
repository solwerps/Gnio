// src/components/empresas/BancosTab.tsx
"use client";

import { Field, Input, Select } from "./ui";
import { CuentaBancariaForm, CuentaOpt } from "@/types/empresas";
import { useMemo } from "react";

type Props = {
  cuentaTmp: CuentaBancariaForm;
  setCuentaTmp: (f: any)=>void;
  cuentas: CuentaBancariaForm[];
  setCuentas: (f: any)=>void;
  bancosSugeridos: string[];
  cuentasNomen: CuentaOpt[];
};

export default function BancosTab({
  Field: _F, Input: _I, Select: _S, // compat
  cuentaTmp, setCuentaTmp, cuentas, setCuentas, bancosSugeridos, cuentasNomen,
}: Props & any) {

  const bancosOpts = useMemo(
    () =>
      Array.from(
        new Set(
          (bancosSugeridos || [])
            .map((b) => String(b ?? "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [bancosSugeridos]
  );

  const agregar = () => {
    const numero = String(cuentaTmp.numero || "").trim();
    const banco = String(cuentaTmp.banco || "").trim();
    const moneda = String(cuentaTmp.moneda || "").trim();

    if (!numero || !banco || !moneda) {
      alert("Completa Número, Banco y Moneda.");
      return;
    }
    setCuentas((arr: any[]) => [...arr, { ...cuentaTmp, numero, banco, moneda }]);
    setCuentaTmp({
      numero: "",
      banco: "",
      descripcion: "",
      moneda: "GTQ",
      saldoInicial: 0,
      cuentaContableId: undefined,
    });
  };

  const eliminar = (idx: number) =>
    setCuentas((arr: any[]) => arr.filter((_, i) => i !== idx));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[900px]">
        <Field label="Número de Cuenta*">
          <Input
            value={cuentaTmp.numero}
            onChange={(e)=>setCuentaTmp((s:any)=>({...s,numero:e.target.value}))}
            placeholder="Ingresa el número de cuenta"
          />
        </Field>

        {/* Select editable (combobox) con datalist */}
        <Field label="Banco*">
          <input
            list="bancos-list"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            placeholder="Selecciona o escribe el banco…"
            value={cuentaTmp.banco}
            onChange={(e)=>setCuentaTmp((s:any)=>({...s,banco:e.target.value}))}
          />
          <datalist id="bancos-list">
            {bancosOpts.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          <p className="text-xs text-neutral-500 mt-1">
            Puedes elegir uno sugerido o escribir un nombre nuevo.
          </p>
        </Field>

        <Field label="Descripción de la cuenta">
          <Input
            value={cuentaTmp.descripcion}
            onChange={(e)=>setCuentaTmp((s:any)=>({...s,descripcion:e.target.value}))}
            placeholder="Caja chica, Cuenta principal, etc."
          />
        </Field>

        <Field label="Moneda*">
          <Select
            value={cuentaTmp.moneda}
            onChange={(e)=>setCuentaTmp((s:any)=>({...s,moneda:e.target.value}))}
          >
            <option>GTQ</option>
            <option>USD</option>
            <option>MXN</option>
          </Select>
        </Field>

        <Field label="Saldo inicial*">
          <Input
            type="number"
            value={cuentaTmp.saldoInicial}
            onChange={(e)=>setCuentaTmp((s:any)=>({
              ...s,
              saldoInicial: Number(e.target.value || 0),
            }))}
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="Selecciona la Cuenta Contable*">
            <Select
              value={String(cuentaTmp.cuentaContableId || "")}
              onChange={(e)=>setCuentaTmp((s:any)=>({
                ...s,
                cuentaContableId: Number(e.target.value) || undefined,
              }))}
            >
              <option value="">Selecciona</option>
              {cuentasNomen.map((c)=> (
                <option key={c.id} value={c.id}>
                  {`${c.codigo} — ${c.descripcion}`}
                </option>
              ))}
            </Select>
            <p className="text-xs text-neutral-500 mt-1">
              Vincular la cuenta contable permitirá afectar automáticamente los asientos.
            </p>
          </Field>
        </div>

        <div className="md:col-span-2">
          <button
            onClick={agregar}
            className="rounded-lg px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            + Agregar Cuenta Bancaria
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-neutral-200">
        <table className="w-full text-left">
          <thead className="bg-neutral-900 text-white">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Número</th>
              <th className="px-4 py-2">Banco</th>
              <th className="px-4 py-2">Moneda</th>
              <th className="px-4 py-2">Saldo inicial</th>
              <th className="px-4 py-2">Cuenta Contable</th>
              <th className="px-4 py-2 w-[80px]">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {cuentas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-neutral-500">
                  No se encontraron Cuentas Bancarias activas
                </td>
              </tr>
            ) : (
              cuentas.map((c, i) => {
                const cc = cuentasNomen.find((x)=>x.id===c.cuentaContableId);
                return (
                  <tr key={`${c.numero}-${i}`}>
                    <td className="px-4 py-2">{i + 1}</td>
                    <td className="px-4 py-2">{c.numero}</td>
                    <td className="px-4 py-2">{c.banco}</td>
                    <td className="px-4 py-2">{c.moneda}</td>
                    <td className="px-4 py-2">{c.saldoInicial}</td>
                    <td className="px-4 py-2">
                      {cc ? `${cc.codigo} — ${cc.descripcion}` : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={()=>eliminar(i)}
                        className="rounded-full w-8 h-8 inline-flex items-center justify-center bg-red-100 text-red-700"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
