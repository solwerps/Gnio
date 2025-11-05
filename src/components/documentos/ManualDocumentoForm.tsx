// src/components/documentos/ManualDocumentoForm.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CuentaOption = {
  value: string;
  label: string;
  nivel: number;
  cuenta: string;
  debeHaber: "DEBE" | "HABER";
  naturaleza: string;
};

const MONEDAS = [
  { value: "GTQ", label: "Quetzal (GTQ)" },
  { value: "USD", label: "Dólar estadounidense (USD)" },
  { value: "SVC", label: "Colones Salvadoreños (SVC)" },
  { value: "NIO", label: "Córdobas Nicaragüenses (NIO)" },
  { value: "DKK", label: "Corona Danesa (DKK)" },
  { value: "NOK", label: "Corona Noruega (NOK)" },
  { value: "SEK", label: "Coronas Sueca (SEK)" },
  { value: "CAD", label: "Dólares Canadienses (CAD)" },
  { value: "HKD", label: "Dólar Hong Kong (HKD)" },
  { value: "TWD", label: "Dólar Taiwán (TWD)" },
  { value: "PTE", label: "Escudo Portugués (PTE)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "CHF", label: "Francos Suizos (CHF)" },
  { value: "HNL", label: "Lempiras Hondureños (HNL)" },
  { value: "GBP", label: "Libras Esterlinas (GBP)" },
  { value: "ARS", label: "Peso Argentina (ARS)" },
  { value: "DOP", label: "Peso Dominicano (DOP)" },
  { value: "COP", label: "Pesos colombianos (COP)" },
  { value: "MXN", label: "Pesos Mexicanos (MXN)" },
  { value: "BRL", label: "Real Brasileño (BRL)" },
  { value: "MYR", label: "Ringgit Malasia (MYR)" },
  { value: "INR", label: "Rupia India (INR)" },
  { value: "PKR", label: "Rupia Pakistán (PKR)" },
  { value: "KRW", label: "Won Coreano (KRW)" },
  { value: "JPY", label: "Yenes Japoneses (JPY)" },
];

const TIPOS_DTE = [
  { value: "FACT", label: "Factura" },
  { value: "FCAM", label: "Factura Cambiaria" },
  { value: "FPEQ", label: "Factura Pequeño Contribuyente" },
  { value: "FCAP", label: "Factura Cambiaria Pequeño Contribuyente" },
  { value: "FESP", label: "Factura Especial" },
  { value: "NABN", label: "Nota de Abono" },
  { value: "RDON", label: "Recibo por Donación" },
  { value: "RECI", label: "Recibo" },
  { value: "NDEB", label: "Nota de Débito" },
  { value: "NCRE", label: "Nota de Crédito" },
];

const TIPOS_OPERACION = [
  { value: "compra", label: "Compra" },
  { value: "venta", label: "Venta" },
];

const TIPOS_TRANSACCION = [
  { value: "bien", label: "Bien" },
  { value: "servicio", label: "Servicio" },
  { value: "bien_y_servicio", label: "Bien y Servicio" },
  { value: "pequeno_contribuyente", label: "Pequeño Contribuyente" },
  { value: "combustibles", label: "Combustibles" },
  { value: "sin_derecho_credito_fiscal", label: "No generan compensación del crédito fiscal" },
  { value: "medicamentos", label: "Medicamentos" },
  { value: "vehiculos_nuevos", label: "Vehículos Nuevos" },
  { value: "vehiculos_anteriores", label: "Vehículos modelos anteriores" },
  { value: "import_ca", label: "Importaciones de Centro América" },
  { value: "import_rm", label: "Importaciones del resto del mundo" },
  { value: "fyduca", label: "Adquisiciones con FYDUCA" },
  { value: "activos_fijos", label: "Compras Activos Fijos" },
  { value: "import_activos_fijos", label: "Importaciones Activos Fijos" },
];

export function ManualDocumentoForm({
  empresaId,
  usuario,
}: {
  empresaId: string;
  usuario: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cuentas, setCuentas] = useState<CuentaOption[]>([]);
  const [operacion, setOperacion] = useState<"compra" | "venta" | "">("");
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [form, setForm] = useState({
    fecha_emision: new Date().toISOString().slice(0, 10),
    fecha_anulacion: "",
    tipo_dte: "FACT",
    tipo: "bien",
    moneda: "GTQ",
    numero_autorizacion: "",
    serie: "",
    numero_dte: "",
    nombre_emisor: "",
    nit_emisor: "",
    nombre_establecimiento: "",
    codigo_establecimiento: "",
    cuenta_debe: "",
    cuenta_haber: "",
    exportacion: false,
    monto_total: "0",
    iva: "0",
    petroleo: "0",
    turismo_hospedaje: "0",
    turismo_pasajes: "0",
    timbre_prensa: "0",
    bomberos: "0",
    tasa_municipal: "0",
    bebidas_alcoholicas: "0",
    tabaco: "0",
    cemento: "0",
    bebidas_no_alcoholicas: "0",
    tarifa_portuaria: "0",
  });

  // 1) traer nomenclatura de la empresa
  useEffect(() => {
    (async () => {
      try {
        const r1 = await fetch(`/api/empresas/${empresaId}/nomenclatura`, {
          cache: "no-store",
          credentials: "include",
        });
        const j1 = await r1.json();
        if (!j1.ok || !j1.nomenclaturaLocalId) {
          setCuentas([]);
          return;
        }
        const localId = j1.nomenclaturaLocalId as number;
        const r2 = await fetch(`/api/nomenclaturas/${localId}`, {
          cache: "no-store",
          credentials: "include",
        });
        const j2 = await r2.json();
        if (!j2.ok) {
          setCuentas([]);
          return;
        }
        const cuentasData: any[] = Array.isArray(j2.data?.cuentas) ? j2.data.cuentas : [];
        setCuentas(
          cuentasData.map((c) => ({
            value: String(c.id),
            label: `${c.descripcion || ""} (${c.cuenta || ""})`.trim(),
            nivel: Number(c.nivel ?? 1),
            cuenta: String(c.cuenta ?? ""),
            debeHaber:
              (String(c.debeHaber || "DEBE").toUpperCase() === "HABER" ? "HABER" : "DEBE") as
                | "DEBE"
                | "HABER",
            naturaleza: String(c.naturaleza || "REVISAR").toUpperCase(),
          }))
        );
      } catch (err) {
        console.error(err);
        setCuentas([]);
      }
    })();
  }, [empresaId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operacion) {
      alert("Selecciona el tipo de operación (compra o venta).");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        empresa_id: Number(empresaId),
        operacion_tipo: operacion,
        date: `${periodo}-01`,
        documentos: [
          {
            fecha_emision: form.fecha_emision,
            numero_autorizacion: form.numero_autorizacion,
            tipo_dte: form.tipo_dte,
            serie: form.serie,
            numero_dte: form.numero_dte,
            nit_emisor: form.nit_emisor,
            nombre_emisor: form.nombre_emisor,
            codigo_establecimiento: form.codigo_establecimiento,
            nombre_establecimiento: form.nombre_establecimiento,
            moneda: form.moneda,
            monto_total: form.monto_total,
            monto_bien: form.tipo === "servicio" ? "0" : form.monto_total,
            monto_servicio: form.tipo === "servicio" ? form.monto_total : "0",
            iva: form.iva,
            petroleo: form.petroleo,
            turismo_hospedaje: form.turismo_hospedaje,
            turismo_pasajes: form.turismo_pasajes,
            timbre_prensa: form.timbre_prensa,
            bomberos: form.bomberos,
            tasa_municipal: form.tasa_municipal,
            bebidas_alcoholicas: form.bebidas_alcoholicas,
            tabaco: form.tabaco,
            cemento: form.cemento,
            bebidas_no_alcoholicas: form.bebidas_no_alcoholicas,
            tarifa_portuaria: form.tarifa_portuaria,
            cuenta_debe: form.cuenta_debe || null,
            cuenta_haber: form.cuenta_haber || null,
            tipo: form.tipo,
          },
        ],
      };

      const r = await fetch("/api/documentos/masivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || j.status >= 400) {
        alert(j.message || "No se pudo guardar el documento.");
        return;
      }
      // ok
      router.push(
        `/dashboard/contador/${usuario}/empresas/${empresaId}/documentos`
      );
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-6 shadow-sm space-y-6"
    >
      {/* fila 1 */}
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Selecciona el tipo de Operación del documento*
          </label>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={operacion}
            onChange={(e) =>
              setOperacion(e.target.value as "compra" | "venta" | "")
            }
          >
            <option value="">Selecciona</option>
            {TIPOS_OPERACION.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Período en el que irá la factura*
          </label>
          <input
            type="month"
            className="w-full rounded-lg border px-3 py-2"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Fecha de emisión*
          </label>
          <input
            type="date"
            name="fecha_emision"
            className="w-full rounded-lg border px-3 py-2"
            value={form.fecha_emision}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* fila 2 */}
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Fecha de anulación (si aplica)
          </label>
          <input
            type="date"
            name="fecha_anulacion"
            className="w-full rounded-lg border px-3 py-2"
            value={form.fecha_anulacion}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Selecciona el tipo de DTE para el documento*
          </label>
          <select
            name="tipo_dte"
            className="w-full rounded-lg border px-3 py-2"
            value={form.tipo_dte}
            onChange={handleChange}
          >
            {TIPOS_DTE.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Selecciona el tipo de la transacción*
          </label>
          <select
            name="tipo"
            className="w-full rounded-lg border px-3 py-2"
            value={form.tipo}
            onChange={handleChange}
          >
            {TIPOS_TRANSACCION.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* fila 3 */}
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Selecciona la moneda del documento*
          </label>
          <select
            name="moneda"
            className="w-full rounded-lg border px-3 py-2"
            value={form.moneda}
            onChange={handleChange}
          >
            {MONEDAS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Número de Autorización*
          </label>
          <input
            name="numero_autorizacion"
            className="w-full rounded-lg border px-3 py-2"
            value={form.numero_autorizacion}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Número de Serie*
          </label>
          <input
            name="serie"
            className="w-full rounded-lg border px-3 py-2"
            value={form.serie}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Número de DTE*
          </label>
          <input
            name="numero_dte"
            className="w-full rounded-lg border px-3 py-2"
            value={form.numero_dte}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* emisor / establecimiento */}
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Nombre del Emisor*
          </label>
          <input
            name="nombre_emisor"
            className="w-full rounded-lg border px-3 py-2"
            value={form.nombre_emisor}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            NIT del Emisor*
          </label>
          <input
            name="nit_emisor"
            className="w-full rounded-lg border px-3 py-2"
            value={form.nit_emisor}
            onChange={handleChange}
          />
        </div>
        <div className="flex items-center gap-2 mt-6">
          <input
            id="exportacion"
            type="checkbox"
            name="exportacion"
            checked={form.exportacion}
            onChange={handleChange}
          />
          <label htmlFor="exportacion" className="text-sm">
            Marcar como exportación
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">
            Nombre del establecimiento*
          </label>
          <input
            name="nombre_establecimiento"
            className="w-full rounded-lg border px-3 py-2"
            value={form.nombre_establecimiento}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Número del establecimiento*
          </label>
          <input
            name="codigo_establecimiento"
            className="w-full rounded-lg border px-3 py-2"
            value={form.codigo_establecimiento}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* cuentas */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">
            Selecciona la cuenta para DEBE*
          </label>
          <select
            name="cuenta_debe"
            className="w-full rounded-lg border px-3 py-2"
            value={form.cuenta_debe}
            onChange={handleChange}
          >
            <option value="">
              {cuentas.length ? "Selecciona" : "Sin nomenclatura"}
            </option>
            {cuentas.map((o) => (
              <option key={o.value} value={o.value} disabled={o.nivel <= 3}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Selecciona la cuenta para HABER*
          </label>
          <select
            name="cuenta_haber"
            className="w-full rounded-lg border px-3 py-2"
            value={form.cuenta_haber}
            onChange={handleChange}
          >
            <option value="">
              {cuentas.length ? "Selecciona" : "Sin nomenclatura"}
            </option>
            {cuentas.map((o) => (
              <option key={o.value} value={o.value} disabled={o.nivel <= 3}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* montos */}
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Monto Total*
          </label>
          <input
            name="monto_total"
            type="number"
            step="0.01"
            className="w-full rounded-lg border px-3 py-2"
            value={form.monto_total}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">IVA</label>
          <input
            name="iva"
            type="number"
            step="0.01"
            className="w-full rounded-lg border px-3 py-2"
            value={form.iva}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Petróleo</label>
          <input
            name="petroleo"
            type="number"
            step="0.01"
            className="w-full rounded-lg border px-3 py-2"
            value={form.petroleo}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* resto de impuestos */}
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Turismo Hospedaje
          </label>
          <input
            name="turismo_hospedaje"
            type="number"
            step="0.01"
            className="w-full rounded-lg border px-3 py-2"
            value={form.turismo_hospedaje}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Turismo Pasajes
          </label>
          <input
            name="turismo_pasajes"
            type="number"
            step="0.01"
            className="w-full rounded-lg border px-3 py-2"
            value={form.turismo_pasajes}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Timbre de Prensa
          </label>
          <input
            name="timbre_prensa"
            type="number"
            step="0.01"
            className="w-full rounded-lg border px-3 py-2"
            value={form.timbre_prensa}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            router.push(
              `/dashboard/contador/${usuario}/empresas/${empresaId}/documentos`
            )
          }
          className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-neutral-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar Documento"}
        </button>
      </div>
    </form>
  );
}
