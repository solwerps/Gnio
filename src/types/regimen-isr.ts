export type SiNo = "SI" | "NO";
export type Periodo = "Mensual" | "Trimestral" | "Anual";

export interface RegimenIsrFila {
  id?: number;            // DB
  orden: number;
  idRegimen: number;

  regimenSistema: string;
  nombreRegimen: string;
  nombreComun: string;

  porcentajeIsr: number;
  paraIsrDe: number;
  hastaIsrDe: number;

  periodo: Periodo;
  presentaAnual: SiNo;

  limiteSalarioActual: number;
  cantidadSalariosAnio: number;
  limiteFacturacionAnual: number;

  lugarVenta: string;
  tipoActividad: string;
  opcionSujetoRetencionIsr: string; // puede ser "Si"/"NO"/otros textos

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

  isSeed?: boolean;
}

export const SI_NO: SiNo[] = ["SI", "NO"];
export const PERIODOS: Periodo[] = ["Mensual", "Trimestral", "Anual"];
export const LUGAR_VENTA = ["Local", "Exportacion", "Intermediario"];
export const TIPO_ACTIVIDAD = [
  "Actividades en General según actividad comercial",
  "Servicios, comercialización de productos y otros",
  "Exportador Habitual",
  "Sector Público",
];
export const OPCION_SUJETO_RET_ISR = ["Si", "NO", "Agente de Retención"];
