// src/components/Upload/UploadDocumentos.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UploadExcel from "@/components/Upload/UploadFacturasExcel";
import UploadXML from "@/components/Upload/UploadFacturasXML";

type Operacion = "compra" | "venta" | "";

// ===== Documento =====
type Doc = {
  fecha_emision: string;
  numero_autorizacion: string;
  tipo_dte: string;
  serie: string;
  numero_dte: string;
  nit_emisor: string;
  nombre_emisor: string;
  codigo_establecimiento?: string;
  nombre_establecimiento?: string;
  id_receptor?: string;
  nombre_receptor?: string;
  nit_certificador?: string;
  nombre_certificador?: string;
  moneda: string;
  monto_total: string;
  monto_bien: string;
  monto_servicio: string;
  factura_estado?: string;
  marca_anulado?: string;
  fecha_anulacion?: string;
  iva: string;
  petroleo: string;
  turismo_hospedaje: string;
  turismo_pasajes: string;
  timbre_prensa: string;
  bomberos: string;
  tasa_municipal: string;
  bebidas_alcoholicas: string;
  tabaco: string;
  cemento: string;
  bebidas_no_alcoholicas: string;
  tarifa_portuaria: string;
  // cuadro
  cuenta_debe?: string | null;
  cuenta_haber?: string | null;
  tipo?: string | null;
};

type CuentaOption = {
  value: string;
  label: string;
  nivel: number;
  cuenta: string;
  debeHaber: "DEBE" | "HABER";
  naturaleza: string;
};

// utils
function money(n: string | number | undefined) {
  const v = Number(n || 0);
  return v.toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function fmtDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-GT");
  } catch {
    return iso as string;
  }
}
const Th = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <th className={`px-4 py-3 text-left font-semibold ${className}`}>{children}</th>
);
const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 text-neutral-800 ${className}`}>{children}</td>
);

// merge excel + xml
const keyDoc = (d: Partial<Doc>) => `${d.serie || ""}#${d.numero_dte || ""}#${d.numero_autorizacion || ""}`;
function mergeDocs(excel: Doc[], xml: Doc[]): Doc[] {
  const map = new Map<string, Doc>();
  for (const d of excel) map.set(keyDoc(d), { ...d });
  for (const x of xml) {
    const k = keyDoc(x);
    if (map.has(k)) {
      const base = map.get(k)!;
      map.set(k, {
        ...base,
        monto_total: x.monto_total || base.monto_total,
        monto_bien: x.monto_bien || base.monto_bien,
        monto_servicio: x.monto_servicio || base.monto_servicio,
        iva: x.iva || base.iva,
        petroleo: x.petroleo || base.petroleo,
        turismo_hospedaje: x.turismo_hospedaje || base.turismo_hospedaje,
        turismo_pasajes: x.turismo_pasajes || base.turismo_pasajes,
        timbre_prensa: x.timbre_prensa || base.timbre_prensa,
        bomberos: x.bomberos || base.bomberos,
        tasa_municipal: x.tasa_municipal || base.tasa_municipal,
        bebidas_alcoholicas: x.bebidas_alcoholicas || base.bebidas_alcoholicas,
        tabaco: x.tabaco || base.tabaco,
        cemento: x.cemento || base.cemento,
        bebidas_no_alcoholicas: x.bebidas_no_alcoholicas || base.bebidas_no_alcoholicas,
        tarifa_portuaria: x.tarifa_portuaria || base.tarifa_portuaria,
        cuenta_debe: x.cuenta_debe ?? base.cuenta_debe ?? null,
        cuenta_haber: x.cuenta_haber ?? base.cuenta_haber ?? null,
        tipo: x.tipo ?? base.tipo ?? null,
      });
    } else {
      map.set(k, { ...x });
    }
  }
  return Array.from(map.values());
}

// catálogos
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

const CODIGOS_PREFERIDOS = {
  ventas_bienes: "410101",
  ventas_servicios: "410102",
  compras_bienes: "520240",
  compras_servicios: "520239",
  combustibles: "520223",
  fpeq: "520238",
  caja: "110101",
};

export default function UploadDocumentos({
  empresaId,
  usuario,
}: {
  empresaId: string;
  usuario: string;
}) {
  const router = useRouter();

  const [operacion, setOperacion] = useState<Operacion>("");
  const [mes, setMes] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [excelDocs, setExcelDocs] = useState<Doc[]>([]);
  const [xmlDocs, setXmlDocs] = useState<Doc[]>([]);
  const merged = useMemo(() => mergeDocs(excelDocs, xmlDocs), [excelDocs, xmlDocs]);

  const [step, setStep] = useState<"files" | "preview">("files");
  const [rows, setRows] = useState<Doc[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // modal 1
  const [showConfirm, setShowConfirm] = useState(false);
  // modal 2
  const [showAfterSave, setShowAfterSave] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string }>({
    ok: true,
    message: "",
  });

  const mesLargo = (m: string) => {
    const [y, mm] = m.split("-").map(Number);
    const d = new Date(y, (mm || 1) - 1, 1);
    return d.toLocaleDateString("es-GT", { month: "long", year: "numeric" });
  };

  const [cuentasOptions, setCuentasOptions] = useState<CuentaOption[]>([]);
  const tiposOptions = useMemo(
    () => (operacion === "compra" ? TIPOS_COMPRA : operacion === "venta" ? TIPOS_VENTA : []),
    [operacion]
  );

  const findByCodigo = (codigo: string, filtroDH?: "DEBE" | "HABER") => {
    const hit = cuentasOptions.find(
      (o) => o.cuenta === codigo && (!filtroDH || o.debeHaber === filtroDH)
    );
    return hit?.value ?? null;
  };
  const fallbackByNaturaleza = (naturalezas: string[], dh: "DEBE" | "HABER") => {
    const hit = cuentasOptions.find(
      (o) => naturalezas.includes(o.naturaleza) && o.debeHaber === dh
    );
    return hit?.value ?? null;
  };

  const confirmarDatos = () => {
    if (!operacion) return alert("Selecciona el tipo de operación.");
    if (!merged.length) return alert("Sube Excel y/o XML primero.");
    setRows(
      merged.map((d) => ({
        ...d,
        cuenta_debe: d.cuenta_debe ?? null,
        cuenta_haber: d.cuenta_haber ?? null,
        tipo: d.tipo ?? null,
      }))
    );
    setStep("preview");
    setSaveMsg(null);
  };

  const descartar = () => {
    setExcelDocs([]);
    setXmlDocs([]);
    setRows([]);
    setStep("files");
    setOperacion("");
    setSaveMsg(null);
  };

  // cargar nomenclatura
  useEffect(() => {
    if (!empresaId || step !== "preview") return;

    (async () => {
      try {
        const r1 = await fetch(`/api/empresas/${empresaId}/nomenclatura`, {
          cache: "no-store",
          credentials: "include",
        });
        const j1 = await r1.json();
        if (!r1.ok || j1?.ok === false) throw new Error(j1?.error || "No se pudo resolver la nomenclatura");
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
        if (!r2.ok || j2?.ok === false) throw new Error(j2?.error || "No se pudo traer la nomenclatura");

        const cuentas: any[] = Array.isArray(j2?.data?.cuentas) ? j2.data.cuentas : [];
        const opts: CuentaOption[] = cuentas.map((c) => ({
          value: String(c.id),
          label: `${c.descripcion || ""} (${c.cuenta || ""})`.trim(),
          nivel: Number(c.nivel ?? 1),
          cuenta: String(c.cuenta ?? ""),
          debeHaber:
            (String(c.debeHaber || "DEBE").toUpperCase() === "HABER" ? "HABER" : "DEBE") as
              | "DEBE"
              | "HABER",
          naturaleza: String(c.naturaleza || "REVISAR").toUpperCase(),
        }));

        setCuentasOptions(opts);
      } catch (e) {
        console.error(e);
        setCuentasOptions([]);
      }
    })();
  }, [empresaId, step]);

  // autocompletar
  useEffect(() => {
    if (step !== "preview" || rows.length === 0 || cuentasOptions.length === 0 || !operacion) return;

    const guessDebeHaber = (doc: Doc) => {
      const ms = Number(doc.monto_servicio || "0");
      const mb = Number(doc.monto_bien || "0");
      const pet = Number(doc.petroleo || "0");

      if (operacion === "venta") {
        const ventasServ = findByCodigo(CODIGOS_PREFERIDOS.ventas_servicios, "HABER");
        const ventasBien = findByCodigo(CODIGOS_PREFERIDOS.ventas_bienes, "HABER");
        const haber = ms > 0 ? (ventasServ ?? ventasBien) : (ventasBien ?? ventasServ);
        const debe =
          findByCodigo(CODIGOS_PREFERIDOS.caja, "DEBE") ?? fallbackByNaturaleza(["ACTIVO"], "DEBE");
        return { cuenta_debe: debe, cuenta_haber: haber };
      }

      if (doc.tipo_dte?.toUpperCase() === "FPEQ") {
        const fpeq =
          findByCodigo(CODIGOS_PREFERIDOS.fpeq, "DEBE") ??
          fallbackByNaturaleza(["GASTOS", "COSTOS", "OTROS_GASTOS"], "DEBE");
        const caja =
          findByCodigo(CODIGOS_PREFERIDOS.caja, "HABER") ??
          fallbackByNaturaleza(["PASIVO", "CAPITAL", "INGRESOS"], "HABER");
        return { cuenta_debe: fpeq, cuenta_haber: caja };
      }

      if (pet > 0) {
        const comb =
          findByCodigo(CODIGOS_PREFERIDOS.combustibles, "DEBE") ??
          fallbackByNaturaleza(["GASTOS", "COSTOS"], "DEBE");
        const caja =
          findByCodigo(CODIGOS_PREFERIDOS.caja, "HABER") ??
          fallbackByNaturaleza(["PASIVO", "CAPITAL", "INGRESOS"], "HABER");
        return { cuenta_debe: comb, cuenta_haber: caja };
      }

      const serv = findByCodigo(CODIGOS_PREFERIDOS.compras_servicios, "DEBE");
      const bien = findByCodigo(CODIGOS_PREFERIDOS.compras_bienes, "DEBE");
      const debe =
        ms > 0
          ? serv ?? bien ?? fallbackByNaturaleza(["GASTOS", "COSTOS"], "DEBE")
          : bien ?? serv ?? fallbackByNaturaleza(["GASTOS", "COSTOS"], "DEBE");
      const haber =
        findByCodigo(CODIGOS_PREFERIDOS.caja, "HABER") ??
        fallbackByNaturaleza(["PASIVO", "CAPITAL", "INGRESOS"], "HABER");

      return { cuenta_debe: debe, cuenta_haber: haber };
    };

    const guessTipo = (doc: Doc) => {
      const ms = Number(doc.monto_servicio || "0");
      const mb = Number(doc.monto_bien || "0");
      const pet = Number(doc.petroleo || "0");
      let t: string = "bien";

      if (pet > 0) t = "combustibles";
      else if (
        operacion === "compra" &&
        (doc.tipo_dte?.toUpperCase() === "FPEQ" || doc.tipo_dte?.toUpperCase() === "FCAP")
      )
        t = "pequeno_contribuyente";
      else if (
        operacion === "compra" &&
        (doc.tipo_dte?.toUpperCase() === "RECI" || doc.tipo_dte?.toUpperCase() === "RDON")
      )
        t = "sin_derecho_credito_fiscal";
      else if (mb > 0 && ms > 0) t = "bien_y_servicio";
      else if (ms > 0) t = "servicio";
      else t = "bien";

      const ok = (operacion === "compra" ? TIPOS_COMPRA : TIPOS_VENTA).some(
        (x) => x.value === t
      );
      return ok ? t : "bien";
    };

    setRows((prev) =>
      prev.map((doc) => {
        const patch: Partial<Doc> = {};
        if (!doc.cuenta_debe || !doc.cuenta_haber) {
          const g = guessDebeHaber(doc);
          patch.cuenta_debe = doc.cuenta_debe ?? g.cuenta_debe ?? null;
          patch.cuenta_haber = doc.cuenta_haber ?? g.cuenta_haber ?? null;
        }
        if (!doc.tipo) {
          patch.tipo = guessTipo(doc);
        }
        return { ...doc, ...patch };
      })
    );
  }, [step, rows.length, cuentasOptions, operacion]);

  const onChangeCuenta = (i: number, field: "cuenta_debe" | "cuenta_haber", value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };
  const onChangeTipo = (i: number, value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, tipo: value } : r)));
  };

  // -------- guardar --------
  const guardar = async () => {
    try {
      setSaving(true);
      setSaveMsg(null);
      const date = `${mes}-01`;

      const payload = {
        empresa_id: Number(empresaId),
        operacion_tipo: operacion === "" ? undefined : (operacion as "venta" | "compra"),
        date,
        documentos: rows.map((d) => ({
          ...d,
          monto_total: Number(d.monto_total || "0"),
          monto_bien: Number(d.monto_bien || "0"),
          monto_servicio: Number(d.monto_servicio || "0"),
          iva: Number(d.iva || "0"),
          petroleo: Number(d.petroleo || "0"),
          turismo_hospedaje: Number(d.turismo_hospedaje || "0"),
          turismo_pasajes: Number(d.turismo_pasajes || "0"),
          timbre_prensa: Number(d.timbre_prensa || "0"),
          bomberos: Number(d.bomberos || "0"),
          tasa_municipal: Number(d.tasa_municipal || "0"),
          bebidas_alcoholicas: Number(d.bebidas_alcoholicas || "0"),
          tabaco: Number(d.tabaco || "0"),
          cemento: Number(d.cemento || "0"),
          bebidas_no_alcoholicas: Number(d.bebidas_no_alcoholicas || "0"),
          tarifa_portuaria: Number(d.tarifa_portuaria || "0"),
        })),
      };

      const r = await fetch("/api/documentos/masivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({} as any));

      // 🆕 caso: duplicados o NIT no coincide (backend manda 409 ó 400)
      if (r.status === 409) {
        // vienen en j.duplicadas del backend
        const dups: any[] = Array.isArray(j?.duplicadas) ? j.duplicadas : [];
        let msg = j?.message || "Estas facturas ya habían sido cargadas.";
        if (dups.length > 0) {
          const detalles = dups
            .map((d) => {
              const serie = d.serie || "-";
              const noDte = d.numeroDte || "-";
              const nit = d.nitEmisor || "-";
              const mesSubida = d.periodo || "-";
              const emp = d.empresaId ? `empresa ${d.empresaId}` : "";
              return `• Serie ${serie} · DTE ${noDte} · NIT ${nit} · ${emp} · mes ${mesSubida}`;
            })
            .join(" | ");
          msg = `${j?.message || "Algunas facturas ya estaban cargadas."} ${detalles}`;
        }
        setSaveMsg(msg);
        setLastResult({ ok: false, message: msg });
        // no abrimos modal 2
        return;
      }

      if (!r.ok || j?.status >= 400) {
        const msg = j?.message || "Error al guardar";
        setSaveMsg(msg);
        setLastResult({ ok: false, message: msg });
        return;
      }

      // ✅ éxito normal
      setSaveMsg("¡Documentos guardados correctamente!");
      setLastResult({ ok: true, message: "¡Documentos guardados correctamente!" });
      setShowAfterSave(true);
    } catch (e: any) {
      const msg = e?.message || "Error al guardar";
      setSaveMsg(msg);
      setLastResult({ ok: false, message: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-neutral-600">
            Selecciona el tipo de Operación de los documentos:
          </label>
          <select
            value={operacion}
            onChange={(e) => setOperacion(e.target.value as Operacion)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Selecciona</option>
            <option value="venta">Venta</option>
            <option value="compra">Compra</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">Selecciona la fecha:</span>
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* paso 1 */}
      {step === "files" && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <UploadExcel onParsed={(rows) => setExcelDocs(rows as Doc[])} />
            <UploadXML onParsedList={(rows) => setXmlDocs(rows as Doc[])} />
          </div>

          <div className="mt-4 flex justify-center">
            <button
              onClick={confirmarDatos}
              className="rounded-xl bg-[#1E64F0] px-6 py-3 font-semibold text-white hover:brightness-110 disabled:opacity-50"
              disabled={!operacion || excelDocs.length + xmlDocs.length === 0}
            >
              Confirmar Datos
            </button>
          </div>
        </div>
      )}

      {/* paso 2 */}
      {step === "preview" && (
        <>
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-x-auto">
            <div className="flex items-center justify-between p-4">
              <div className="text-neutral-700">
                <div className="font-semibold">Datos cargados correctamente</div>
                <div className="text-sm text-neutral-500">Documentos recolectados: {rows.length}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={descartar}
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
                >
                  Descartar información
                </button>
              </div>
            </div>

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
                {rows.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-neutral-500" colSpan={40}>
                      Sin datos
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr key={`${keyDoc(r)}-${i}`} className="border-t border-neutral-100 hover:bg-neutral-50">
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
                    <Td className="text-right">{money(r.monto_total)}</Td>
                    <Td className="text-right">{money(r.monto_bien)}</Td>
                    <Td className="text-right">{money(r.monto_servicio)}</Td>
                    <Td>{r.factura_estado || ""}</Td>
                    <Td>{r.marca_anulado || ""}</Td>
                    <Td>{r.fecha_anulacion ? fmtDate(r.fecha_anulacion) : ""}</Td>
                    <Td className="text-right">{money(r.iva)}</Td>
                    <Td className="text-right">{money(r.petroleo)}</Td>
                    <Td className="text-right">{money(r.turismo_hospedaje)}</Td>
                    <Td className="text-right">{money(r.turismo_pasajes)}</Td>
                    <Td className="text-right">{money(r.timbre_prensa)}</Td>
                    <Td className="text-right">{money(r.bomberos)}</Td>
                    <Td className="text-right">{money(r.tasa_municipal)}</Td>
                    <Td className="text-right">{money(r.bebidas_alcoholicas)}</Td>
                    <Td className="text-right">{money(r.tabaco)}</Td>
                    <Td className="text-right">{money(r.cemento)}</Td>
                    <Td className="text-right">{money(r.bebidas_no_alcoholicas)}</Td>
                    <Td className="text-right">{money(r.tarifa_portuaria)}</Td>
                    <Td>{operacion || ""}</Td>
                    <Td>
                      <select
                        className="w-[240px] rounded-lg border border-neutral-300 bg-white px-2 py-1 disabled:opacity-50"
                        value={r.cuenta_debe ?? ""}
                        onChange={(e) => onChangeCuenta(i, "cuenta_debe", e.target.value)}
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
                        onChange={(e) => onChangeCuenta(i, "cuenta_haber", e.target.value)}
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
                        onChange={(e) => onChangeTipo(i, e.target.value)}
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

          {/* botones */}
          <div className="mx-auto mt-3 flex w-full max-w-[1120px] items-center justify-center gap-3">
            <button
              onClick={() => setShowConfirm(true)}
              disabled={saving || rows.length === 0}
              className="rounded-xl bg-[#1E64F0] px-6 py-3 font-semibold text-white hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar Datos"}
            </button>
            <button
              onClick={descartar}
              disabled={saving}
              className="rounded-xl border border-neutral-300 bg-white px-6 py-3 font-semibold hover:bg-neutral-50 disabled:opacity-50"
            >
              Descartar Información
            </button>
          </div>

          {saveMsg && (
            <div
              className={`mx-auto mt-3 w-full max-w-[1120px] rounded-xl border px-4 py-3 text-sm ${
                saveMsg.toLowerCase().includes("error") ||
                saveMsg.toLowerCase().includes("no coincide") ||
                saveMsg.toLowerCase().includes("ya fueron cargadas") ||
                saveMsg.toLowerCase().includes("ya estaban cargadas")
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : "border-emerald-300 bg-emerald-50 text-emerald-700"
              }`}
            >
              {saveMsg}
            </div>
          )}
        </>
      )}

      {/* modal 1: confirmar carga */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-[680px] rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-semibold">Cargar Facturas</h3>
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-full p-2 hover:bg-neutral-100"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="text-center text-lg font-medium text-neutral-800">
                ¿Está seguro de realizar esta acción?
              </p>
              <div className="mx-auto mt-4 w-fit space-y-2 text-base">
                <div>
                  <span className="font-semibold">Tipo de operación:</span>{" "}
                  <span className="text-[#1E64F0]">
                    {operacion ? (operacion === "venta" ? "Venta" : "Compra") : "-"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Empresa:</span>{" "}
                  <span className="text-[#1E64F0]">{empresaId}</span>
                </div>
                <div>
                  <span className="font-semibold">Fecha:</span>{" "}
                  <span className="text-[#1E64F0]">{mesLargo(mes)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 border-t px-6 py-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 font-medium hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setShowConfirm(false);
                  await guardar();
                }}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-white hover:brightness-110"
              >
                Cargar Facturas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* modal 2: después de guardar */}
      {showAfterSave && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-[520px] rounded-2xl bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold">
                {lastResult.ok ? "Carga exitosa" : "No se pudo cargar"}
              </h3>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-neutral-700">{lastResult.message}</p>
              {lastResult.ok ? (
                <p className="text-neutral-500">¿Quieres seguir subiendo más facturas?</p>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              {lastResult.ok ? (
                <>
                  <button
                    onClick={() => {
                      setShowAfterSave(false);
                      router.push(
                        `/dashboard/contador/${usuario}/empresas/${empresaId}/documentos`
                      );
                    }}
                    className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 font-medium hover:bg-neutral-50"
                  >
                    No, ir a documentos
                  </button>
                  <button
                    onClick={() => {
                      setShowAfterSave(false);
                      descartar();
                    }}
                    className="rounded-xl bg-[#1E64F0] px-5 py-2.5 font-semibold text-white hover:brightness-110"
                  >
                    Sí, seguir subiendo
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAfterSave(false)}
                  className="rounded-xl bg-[#1E64F0] px-5 py-2.5 font-semibold text-white hover:brightness-110"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
