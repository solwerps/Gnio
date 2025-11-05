// ================================
// src/lib/utils/index.ts
// Punto ÚNICO de exports para la vista de Documentos
// (sin depender de '@/utils' ni crear duplicados).
// ================================

// -------- TIPOS BÁSICOS --------
export type OptionType = {
  value: string | number;
  label: string;
  error?: string;
  // puedes añadir extras que manejen tus <Select/> como 'nit'
  nit?: string;
};

export type SelectOption = {
  value: string | number;
  label: string;
  nivel?: number; // lo usa SelectTable para bloquear <= 3
};

// --- Tipos de Documento (para la columna "Tipo")
export type TipoFactura =
  | "bien"
  | "servicio"
  | "bien_y_servicio"
  | "combustibles"
  | "pequeno_contribuyente"
  | "sin_derecho_credito_fiscal";

// CSV/Excel row (lo que llega del Excel). Mantenemos index signature
// para no romper si hay columnas adicionales.
export interface IUploadDocumento {
  [k: string]: any;
  "Fecha de emisión"?: string;
  "Número de Autorización"?: string;
  "Tipo de DTE (nombre)"?: string;
  "Serie"?: string;
  "Número del DTE"?: string;
  "NIT del emisor"?: string;
  "Nombre completo del emisor"?: string;
  "Código de establecimiento"?: string;
  "Nombre del establecimiento"?: string;
  "ID del receptor"?: string;
  "Nombre completo del receptor"?: string;
  "NIT del Certificador"?: string;
  "Nombre completo del Certificador"?: string;
  "Moneda"?: string;
  "Gran Total (Moneda Original)"?: string;
  "Estado"?: string;
  "Marca de anulado"?: string;
  "Fecha de anulación"?: string;
  "IVA (monto de este impuesto)"?: string;
  "Petróleo (monto de este impuesto)"?: string;
  "Turismo Hospedaje (monto de este impuesto)"?: string;
  "Turismo Pasajes (monto de este impuesto)"?: string;
  "Timbre de Prensa (monto de este impuesto)"?: string;
  "Bomberos (monto de este impuesto)"?: string;
  "Tasa Municipal (monto de este impuesto)"?: string;
  "Bebidas alcohólicas (monto de este impuesto)"?: string;
  "Bebidas no Alcohólicas (monto de este impuesto)"?: string;
  "Tabaco (monto de este impuesto)"?: string;
  "Cemento (monto de este impuesto)"?: string;
  "Tarifa Portuaria (monto de este impuesto)"?: string;
}

// Documento combinado (lo que envías al backend)
export interface IDocUpload {
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
  estado?: string;
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
  bebidas_no_alcoholicas: string;
  tabaco: string;
  cemento: string;
  tarifa_portuaria: string;
  monto_bien: string;
  monto_servicio: string;

  // Autocompletados:
  cuenta_debe: string | null;
  cuenta_haber: string | null;
  tipo: TipoFactura;
}

// IFactura que viene del XML parseado
export interface IFactura {
  uuid?: string;
  identificador_unico?: string;
  fecha_emision: string;
  numero_autorizacion: string | null;
  tipo_dte: string;
  serie: string | null;
  numero_dte: string;
  nit_emisor: string | null;
  nombre_emisor: string | null;
  codigo_establecimiento?: string | null;
  nombre_establecimiento?: string | null;
  id_receptor?: string | null;
  nombre_receptor?: string | null;
  moneda: string;
  monto_total: string;
  monto_bien: string;
  monto_servicio: string;
  iva: string;
  petroleo: string;
  turismo_hospedaje: string;
  turismo_pasajes: string;
  timbre_prensa: string;
  bomberos: string;
  tasa_municipal: string;
  bebidas_alcoholicas: string;
  bebidas_no_alcoholicas: string;
  tabaco: string;
  cemento: string;
  tarifa_portuaria: string;
}

// --------- HELPERS / FORMAT ----------

/** Devuelve 'YYYY-MM-DD' cuando puede; si no, deja el valor original */
export function parseDate(v: any): string {
  try {
    if (!v) return "";
    // si ya viene '2025-10-31...' cortamos
    const s = String(v);
    if (s.length >= 10 && /\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return s;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return String(v ?? "");
  }
}

// --------- OPCIONES PARA "Tipo" ----------
export const tiposDocumentoVenta: OptionType[] = [
  { value: "bien", label: "Bien" },
  { value: "servicio", label: "Servicio" },
  { value: "bien_y_servicio", label: "Bien y Servicio" }
];

export const tiposDocumentoCompra: OptionType[] = [
  { value: "bien", label: "Bien" },
  { value: "servicio", label: "Servicio" },
  { value: "bien_y_servicio", label: "Bien y Servicio" },
  { value: "combustibles", label: "Combustibles" },
  { value: "pequeno_contribuyente", label: "Pequeño Contribuyente" },
  { value: "sin_derecho_credito_fiscal", label: "Sin derecho a CF" }
];

// --------- LLAMADAS DE RED (AJUSTA ENDPOINTS A TU API) ----------
type ApiResp<T> = { status: number; data: T; message?: string };

// NOTA: Ajusta estos endpoints si tu backend usa otros paths.
const EMPRESAS_ENDPOINT = "/api/empresas/select"; // fallback más común
const DOCUMENTOS_UPLOAD_ENDPOINT = "/api/documentos/carga-masiva";

export async function obtenerEmpresas(withNit = true): Promise<ApiResp<OptionType[]>> {
  try {
    // 1) intentamos /api/empresas/select
    let res = await fetch(EMPRESAS_ENDPOINT, { cache: "no-store" });
    if (!res.ok) {
      // 2) fallback a /api/empresas
      res = await fetch("/api/empresas", { cache: "no-store" });
    }
    if (!res.ok) {
      return { status: res.status, data: [], message: "No se pudieron obtener empresas" };
    }
    const json = await res.json();

    // Acomodamos a { value, label, nit? }
    const items = Array.isArray(json?.data) ? json.data : json;
    const options: OptionType[] = items.map((e: any) => ({
      value: e.id ?? e.value ?? e.ID ?? "",
      label: e.nombre ?? e.label ?? e.razonSocial ?? "Empresa",
      nit: e.nit ?? e.NIT ?? undefined
    }));

    return { status: 200, data: options };
  } catch (e: any) {
    return { status: 500, data: [], message: e?.message || "Error de red" };
  }
}

export async function crearDocumentos(
  documentos: IDocUpload[],
  empresaId: number,
  tipoOperacion: "compra" | "venta",
  fechaBase: Date
): Promise<ApiResp<{ inserted: number }>> {
  try {
    const body = {
      empresaId,
      tipoOperacion,
      fecha: fechaBase.toISOString(),
      documentos
    };

    // 1) intentamos endpoint principal
    let res = await fetch(DOCUMENTOS_UPLOAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    // 2) fallback alterno común
    if (!res.ok) {
      res = await fetch("/api/documentos/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }

    if (!res.ok) {
      const text = await res.text();
      return { status: res.status, data: { inserted: 0 }, message: text || "Error al guardar" };
    }

    const json = await res.json();
    return { status: 200, data: { inserted: json?.inserted ?? json?.count ?? 0 } };
  } catch (e: any) {
    return { status: 500, data: { inserted: 0 }, message: e?.message || "Error de red" };
  }
}

// --------- RE-EXPORT DE obtenerCuentasByEmpresa ---------
export { obtenerCuentasByEmpresa } from "./obtenerCuentasByEmpresa";
