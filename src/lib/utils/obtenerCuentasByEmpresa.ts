// ===========================================
// src/lib/utils/obtenerCuentasByEmpresa.ts
// Devuelve opciones de cuentas (nomenclatura) para SelectTable
// ===========================================

import type { SelectOption } from "./index";

type ApiResp<T> = { status: number; data: T; message?: string };

// Ajusta estos endpoints si tu backend usa otros.
const CUENTAS_ENDPOINT = "/api/cuentas";              // ?empresaId=...
const NOMEN_EMPRESA_ENDPOINT = "/api/nomenclatura";   // ?empresaId=... (fallback)

export async function obtenerCuentasByEmpresa(
  empresaId: number,
  includeLeafOnly = true
): Promise<ApiResp<SelectOption[]>> {
  try {
    // 1) principal
    let res = await fetch(`${CUENTAS_ENDPOINT}?empresaId=${empresaId}&leaf=${includeLeafOnly ? 1 : 0}`, {
      cache: "no-store"
    });

    // 2) fallback alterno
    if (!res.ok) {
      res = await fetch(`${NOMEN_EMPRESA_ENDPOINT}?empresaId=${empresaId}`, { cache: "no-store" });
    }

    if (!res.ok) {
      return { status: res.status, data: [], message: "No se pudieron obtener cuentas" };
    }

    const json = await res.json();
    // normalizamos a { value, label, nivel }
    const items = Array.isArray(json?.data) ? json.data : json;
    const options: SelectOption[] = items.map((c: any) => ({
      value: c.id ?? c.value ?? "",
      label: c.label ?? `${c.codigo ?? ""} - ${c.nombre ?? c.descripcion ?? "Cuenta"}`.trim(),
      nivel: c.nivel ?? c.depth ?? 4
    }));

    return { status: 200, data: options };
  } catch (e: any) {
    return { status: 500, data: [], message: e?.message || "Error de red" };
  }
}
