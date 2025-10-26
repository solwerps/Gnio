// src/helpers/nomenclaturaLocks.ts
export type LockField = "descripcion" | "debeHaber" | "nivel" | "tipo" | "naturaleza";

/**
 * Regla:
 * - Si principalDetalle === "P": bloquea columna completa (solo lectura).
 * - Si principalDetalle === "D": editable salvo que plantilla haya puesto lock* en esa celda.
 * - Acciones (+, 🗑) y el select de principal/detalle NO se bloquean aquí.
 */
export function isCellDisabled(row: any, field: LockField): boolean {
  const hardLock =
    field === "descripcion" ? row.lockDescripcion :
    field === "debeHaber"   ? row.lockDebeHaber :
    field === "nivel"       ? row.lockNivel :
    field === "tipo"        ? row.lockTipo :
    /* naturaleza */          row.lockNaturaleza;

  if (row.principalDetalle === "P") return true;
  return !!hardLock;
}
