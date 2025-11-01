//src/types/documentos.ts

export type TipoOperacion = 'compra' | 'venta';

export interface DocumentoDTO {
  id: number; uuid: string; empresaId: number;
  operacion: 'COMPRA' | 'VENTA';
  fechaEmision: string; fechaTrabajo: string;
  tipoDte: string; serie: string; numeroDte: string; numeroAutorizacion: string;
  nitEmisor: string; nombreEmisor: string; nombreEstablecimiento?: string;
  moneda: string; montoTotal: string; montoBien?: string; montoServicio?: string; iva?: string;
  estado: number; comentario?: string; createdAt: string;
}
