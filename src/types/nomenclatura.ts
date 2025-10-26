// src/types/nomenclatura.ts
export type Naturaleza =
  | "ACTIVO" | "PASIVO" | "CAPITAL"
  | "INGRESOS" | "COSTOS" | "GASTOS"
  | "OTROS INGRESOS" | "OTROS GASTOS" | "REVISAR";

export type Tipo = "BALANCE_GENERAL" | "ESTADO_RESULTADOS" | "CAPITAL";

export interface CuentaRow {
  orden: number;
  cuenta: string;
  descripcion: string;
  debeHaber: "DEBE" | "HABER";
  principalDetalle: "P" | "D" | "";
  nivel: number;
  tipo: Tipo;
  naturaleza: Naturaleza;
  isPlantilla: boolean;

  // locks de columnas (ya los tenías)
  lockCuenta: boolean;
  lockDescripcion: boolean;
  lockDebeHaber: boolean;
  lockPrincipalDetalle: boolean;
  lockNivel: boolean;
  lockTipo: boolean;
  lockNaturaleza: boolean;

  // (obsoleto, pero soportado) — si viene, se usa como default
  lockRowActions?: boolean;

  // NUEVO: acciones separadas
  lockAdd?: boolean;     // true = NO puede agregar debajo
  lockDelete?: boolean;  // true = NO puede eliminar
}
