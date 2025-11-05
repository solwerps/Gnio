// ==============================================
// PATH: src/lib/utils/types.ts
// ==============================================

export type Operacion = "compra" | "venta";

// SelectOption que usa tu <SelectTable>
// (nivel, debeHaber y naturaleza se usan para deshabilitar cuentas de nivel <= 3)
export interface SelectOption {
  value: string;           // id de nomenclaturaCuenta (string)
  label: string;           // Ej. "Servicios (410102)"
  nivel?: number;          // nivel jerárquico (para deshabilitar <= 3)
  debeHaber?: "DEBE" | "HABER";
  naturaleza?: string;     // ACTIVO, GASTOS, etc.
}

// IFactura (XML) usado en la combinación y en omitColumn(...)
export interface IFactura {
  uuid?: string;
  identificador_unico?: string;
  fecha_emision: string;            // ISO o string fecha
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
  nit_certificador?: string | null;
  nombre_certificador?: string | null;

  moneda?: string;
  monto_total?: string;
  monto_bien?: string;
  monto_servicio?: string;

  // Impuestos (opcionales)
  iva?: string;
  petroleo?: string;
  turismo_hospedaje?: string;
  turismo_pasajes?: string;
  timbre_prensa?: string;
  bomberos?: string;
  tasa_municipal?: string;
  bebidas_alcoholicas?: string;
  bebidas_no_alcoholicas?: string;
  tabaco?: string;
  cemento?: string;
  tarifa_portuaria?: string;
}

export interface Paged<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
