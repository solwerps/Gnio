// src/types/regimen-iva.ts

export type SiNo = "SI" | "NO";
export type Periodo = "Mensual" | "Trimestral" | "Anual";

export interface RegimenIvaFila {
  id?: number;          // DB
  orden: number;

  idRegimen: number;    // visible en tabla (no editable)
  regimenSistema: string;
  nombreRegimen: string;
  nombreComun: string;
  porcentajeIva: number;

  periodo: Periodo;
  presentaAnual: SiNo;
  limiteSalarioActual: number;
  cantidadSalariosAnio: number;
  limiteFacturacionAnual: number;

  lugarVenta: string;
  tipoActividad: string;
  opcionSujetoRetencionIva: string;
  porcentajeRetencionIva: number;
  montoRetencionMayorIgual: number;
  opcionExentoIva: "EXENTO" | "NO EXENTO";

  presentaFacturas: SiNo;
  retencionIva: SiNo;
  retencionIsr: SiNo;
  presentanIso: SiNo;
  presentaInventarios: SiNo;
  libroCompras: SiNo;
  libroVentas: SiNo;
  libroDiario: SiNo;
  libroDiarioDetalle: SiNo;
  libroMayor: SiNo;
  balanceGeneralEstadoResult: SiNo;
  estadosFinancieros: SiNo;
  conciliacionBancaria: SiNo;
  asientoContable: SiNo;

  isSeed?: boolean;     // para bloquear borrar si es true
}

export const SI_NO: SiNo[] = ["SI", "NO"];
export const PERIODOS: Periodo[] = ["Mensual", "Trimestral", "Anual"];

// ⚠️ Completa / ajusta según tu Excel (dejo valores que se ven en tus capturas)
export const LUGAR_VENTA = ["Local", "Exportacion", "Intermediario"];
export const TIPO_ACTIVIDAD = [
  "Agricultores y Artesanos",
  "Servicios, comercialización de productos y otros",
  "Distribuidores de agropecuarios y pecuarios",
  "Exportador Habitual",
  "Sector Público",
  "Operadora de Tarjetas de Crédito o Débito",
  "Ventas exentas y servicios exentos",
  "Medicamentos genéricos, alternativos y antirretrovirales",
];
export const OPCION_SUJETO_RET_IVA = [
  "SI", "NO", "PAGA DIRECTO", "Exportador (Decreto 29-89)", "Exportador con Dualidad (Decreto 29-89)"
];
export const OPCION_EXENTO = ["EXENTO", "NO EXENTO"] as const;
