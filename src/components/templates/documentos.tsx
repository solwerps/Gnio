// src/components/templates/documentos.tsx
"use client";

import React, { useEffect, useState } from "react";

type Props = { empresaId: string; operacion: "" | "compra" | "venta"; mes: string };

type IFactura = {
  uuid: string;
  fecha_emision: string | null;
  numero_autorizacion: string | null;
  tipo_dte: string;
  serie: string | null;
  numero_dte: string;
  nit_emisor: string | null;
  nombre_emisor: string | null;
  codigo_establecimiento: string | null;
  nombre_establecimiento: string | null;
  id_receptor: string | null;
  nombre_receptor: string | null;
  nit_certificador: string | null;
  nombre_certificador: string | null;
  moneda: string;
  monto_total: number;
  monto_bien: number;
  monto_servicio: number;
  factura_estado: string;
  marca_anulado: string; // la API lo manda como "Sí" | ""
  fecha_anulacion: string | null;
  iva: number;
  petroleo: number;
  turismo_hospedaje: number;
  turismo_pasajes: number;
  timbre_prensa: number;
  bomberos: number;
  tasa_municipal: number;
  bebidas_alcoholicas: number;
  tabaco: number;
  cemento: number;
  bebidas_no_alcoholicas: number;
  tarifa_portuaria: number;
  tipo_operacion: "" | "compra" | "venta";
  cuenta_debe?: string | null;
  cuenta_haber?: string | null;
  tipo?: string | null;
};

function fmtMoney(n?: number) {
  const v = Number(n || 0);
  return v.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-GT");
  } catch {
    return iso as string;
  }
}

export default function DocumentosTemplate({ empresaId, operacion, mes }: Props) {
  const [rows, setRows] = useState<IFactura[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // catálogo de cuentas (para los selects)
  const [cuentasOptions, setCuentasOptions] = useState<
    { value: string; label: string; nivel: number }[]
  >([]);

  // 1) traer docs
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const qs = new URLSearchParams({
          empresaId,
          mes,
          operacion,
          page: String(page),
          pageSize: String(pageSize),
        });
        const r = await fetch(`/api/documentos?${qs.toString()}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || j?.ok === false) throw new Error(j?.error || "Error al cargar documentos");

        // la API ya viene con data.data
        const payload = j?.data ?? j;
        const data: IFactura[] = payload?.data || [];
        setRows(data);
        setTotal(payload?.total || 0);
      } catch (e: any) {
        setErr(e?.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    })();
  }, [empresaId, mes, operacion, page, pageSize]);

  // 2) traer nomenclatura para los selects
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      try {
        const r1 = await fetch(`/api/empresas/${empresaId}/nomenclatura`, {
          cache: "no-store",
          credentials: "include",
        });
        const j1 = await r1.json();
        if (!r1.ok || j1?.ok === false) {
          setCuentasOptions([]);
          return;
        }
        const localId = j1?.nomenclaturaLocalId;
        if (!localId) {
          setCuentasOptions([]);
          return;
        }

        const r2 = await fetch(`/api/nomenclaturas/${localId}`, {
          cache: "no-store",
          credentials: "include",
        });
        const j2 = await r2.json();
        if (!r2.ok || j2?.ok === false) {
          setCuentasOptions([]);
          return;
        }

        const cuentas: any[] = Array.isArray(j2?.data?.cuentas) ? j2.data.cuentas : [];
        setCuentasOptions(
          cuentas.map((c) => ({
            value: String(c.id),
            label: `${c.descripcion || ""} (${c.cuenta || ""})`.trim(),
            nivel: Number(c.nivel ?? 1),
          }))
        );
      } catch (e) {
        console.error(e);
        setCuentasOptions([]);
      }
    })();
  }, [empresaId]);

  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const from = rows.length ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);

  // handlers para cambiar cuenta/tipo en la tabla
  const onChangeCuenta = (uuid: string, field: "cuenta_debe" | "cuenta_haber", value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.uuid === uuid ? { ...r, [field]: value === "" ? null : value } : r))
    );
  };
  const onChangeTipo = (uuid: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.uuid === uuid ? { ...r, tipo: value } : r)));
  };

  // catálogos para "tipo"
  const TIPOS_COMPRA = [
    { value: "bien", label: "Bien" },
    { value: "servicio", label: "Servicio" },
    { value: "bien_y_servicio", label: "Bien y Servicio" },
    { value: "combustibles", label: "Combustibles" },
    { value: "pequeno_contribuyente", label: "Pequeño Contribuyente" },
    { value: "sin_derecho_credito_fiscal", label: "Sin Derecho a CF" },
  ];
  const TIPOS_VENTA = [
    { value: "bien", label: "Bien" },
    { value: "servicio", label: "Servicio" },
    { value: "bien_y_servicio", label: "Bien y Servicio" },
  ];
  const tiposOptions =
    operacion === "compra" ? TIPOS_COMPRA : operacion === "venta" ? TIPOS_VENTA : [];

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-[1120px] overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-[2600px] w-full text-sm">
          <thead>
            <tr className="bg-neutral-100 text-neutral-700">
              <Th>Fecha de Emisión</Th>
              <Th>Número de Autorización</Th>
              <Th>Tipo de DTE</Th>
              <Th>Serie</Th>
              <Th>Número de DTE</Th>
              <Th>NIT Emisor</Th>
              <Th>Nombre Emisor</Th>
              <Th>Código Establecimiento</Th>
              <Th>Nombre Establecimiento</Th>
              <Th>ID Receptor</Th>
              <Th>Nombre Receptor</Th>
              <Th>NIT Certificador</Th>
              <Th>Nombre Certificador</Th>
              <Th>Moneda</Th>
              <Th className="text-right">Monto Total</Th>
              <Th className="text-right">Monto Bien</Th>
              <Th className="text-right">Monto Servicio</Th>
              <Th>Estado Factura</Th>
              <Th>Marca Anulado</Th>
              <Th>Fecha de Anulación</Th>
              <Th className="text-right">IVA</Th>
              <Th className="text-right">Petróleo</Th>
              <Th className="text-right">Turismo/Hospedaje</Th>
              <Th className="text-right">Turismo/Pasajes</Th>
              <Th className="text-right">Timbre de Prensa</Th>
              <Th className="text-right">Bomberos</Th>
              <Th className="text-right">Tasa Municipal</Th>
              <Th className="text-right">Bebidas Alcohólicas</Th>
              <Th className="text-right">Tabaco</Th>
              <Th className="text-right">Cemento</Th>
              <Th className="text-right">Bebidas No Alcohólicas</Th>
              <Th className="text-right">Tarifa Portuaria</Th>
              <Th>Tipo de Operación</Th>
              <Th>Cuenta Debe</Th>
              <Th>Cuenta Haber</Th>
              <Th>Tipo</Th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-6 text-center text-neutral-500" colSpan={40}>
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && err && (
              <tr>
                <td className="p-6 text-center text-red-600" colSpan={40}>
                  {err}
                </td>
              </tr>
            )}
            {!loading && !err && rows.length === 0 && (
              <tr>
                <td className="p-6 text-center text-neutral-500" colSpan={40}>
                  Sin datos
                </td>
              </tr>
            )}
            {!loading &&
              !err &&
              rows.map((r) => (
                <tr key={r.uuid} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <Td>{fmtDate(r.fecha_emision)}</Td>
                  <Td className="max-w-[220px] truncate">{r.numero_autorizacion || ""}</Td>
                  <Td>{r.tipo_dte}</Td>
                  <Td>{r.serie || ""}</Td>
                  <Td className="max-w-[160px] truncate">{r.numero_dte}</Td>
                  <Td>{r.nit_emisor || ""}</Td>
                  <Td className="max-w-[260px] truncate">{r.nombre_emisor || ""}</Td>
                  <Td>{r.codigo_establecimiento || ""}</Td>
                  <Td className="max-w-[240px] truncate">{r.nombre_establecimiento || ""}</Td>
                  <Td>{r.id_receptor || ""}</Td>
                  <Td className="max-w-[260px] truncate">{r.nombre_receptor || ""}</Td>
                  <Td>{r.nit_certificador || ""}</Td>
                  <Td className="max-w-[240px] truncate">{r.nombre_certificador || ""}</Td>
                  <Td>{r.moneda || ""}</Td>
                  <Td className="text-right">{fmtMoney(r.monto_total)}</Td>
                  <Td className="text-right">{fmtMoney(r.monto_bien)}</Td>
                  <Td className="text-right">{fmtMoney(r.monto_servicio)}</Td>
                  <Td>{r.factura_estado || ""}</Td>
                  <Td>{r.marca_anulado || ""}</Td>
                  <Td>{r.fecha_anulacion ? fmtDate(r.fecha_anulacion) : ""}</Td>
                  <Td className="text-right">{fmtMoney(r.iva)}</Td>
                  <Td className="text-right">{fmtMoney(r.petroleo)}</Td>
                  <Td className="text-right">{fmtMoney(r.turismo_hospedaje)}</Td>
                  <Td className="text-right">{fmtMoney(r.turismo_pasajes)}</Td>
                  <Td className="text-right">{fmtMoney(r.timbre_prensa)}</Td>
                  <Td className="text-right">{fmtMoney(r.bomberos)}</Td>
                  <Td className="text-right">{fmtMoney(r.tasa_municipal)}</Td>
                  <Td className="text-right">{fmtMoney(r.bebidas_alcoholicas)}</Td>
                  <Td className="text-right">{fmtMoney(r.tabaco)}</Td>
                  <Td className="text-right">{fmtMoney(r.cemento)}</Td>
                  <Td className="text-right">{fmtMoney(r.bebidas_no_alcoholicas)}</Td>
                  <Td className="text-right">{fmtMoney(r.tarifa_portuaria)}</Td>
                  <Td>{r.tipo_operacion || ""}</Td>
                  <Td>
                    <select
                      className="w-[240px] rounded-lg border border-neutral-300 bg-white px-2 py-1 disabled:opacity-50"
                      value={r.cuenta_debe ?? ""}
                      onChange={(e) => onChangeCuenta(r.uuid, "cuenta_debe", e.target.value)}
                      disabled={cuentasOptions.length === 0}
                    >
                      <option value="">
                        {cuentasOptions.length ? "Selecciona" : "Sin nomenclatura"}
                      </option>
                      {cuentasOptions.map((o) => (
                        <option key={o.value} value={o.value} disabled={o.nivel <= 3}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Td>
                  <Td>
                    <select
                      className="w-[240px] rounded-lg border border-neutral-300 bg-white px-2 py-1 disabled:opacity-50"
                      value={r.cuenta_haber ?? ""}
                      onChange={(e) => onChangeCuenta(r.uuid, "cuenta_haber", e.target.value)}
                      disabled={cuentasOptions.length === 0}
                    >
                      <option value="">
                        {cuentasOptions.length ? "Selecciona" : "Sin nomenclatura"}
                      </option>
                      {cuentasOptions.map((o) => (
                        <option key={o.value} value={o.value} disabled={o.nivel <= 3}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Td>
                  <Td>
                    <select
                      className="w-[220px] rounded-lg border border-neutral-300 bg-white px-2 py-1"
                      value={r.tipo ?? ""}
                      onChange={(e) => onChangeTipo(r.uuid, e.target.value)}
                    >
                      <option value="">
                        {tiposOptions.length ? "Selecciona" : "Sin opciones"}
                      </option>
                      {tiposOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* paginación */}
      <div className="mx-auto mt-3 flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-neutral-600">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1"
          >
            {[10, 25, 50].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="text-neutral-600">
          {from}-{to} of {total}
        </div>
        <div className="flex items-center gap-1">
          <Nav disabled={page === 1} onClick={() => setPage(1)} title="Primera">
            «
          </Nav>
          <Nav
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            title="Anterior"
          >
            ‹
          </Nav>
          <Nav
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
            title="Siguiente"
          >
            ›
          </Nav>
          <Nav
            disabled={page * pageSize >= total}
            onClick={() => setPage(maxPage)}
            title="Última"
          >
            »
          </Nav>
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-neutral-800 ${className}`}>{children}</td>;
}
function Nav({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
