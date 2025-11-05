// src/lib/utils/retenciones.ts

// dd/mm/yyyy o yyyy-mm-dd -> Date
export function parseFechaEmision(s: string): Date {
  if (!s) return new Date();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split("/").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

// "12,345.67" -> 12345.67
export function asNum(v: unknown): number {
  if (v == null) return 0;
  const s = String(v).replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// normaliza a fecha (00:00)
export function asDateOnly(v: unknown): Date {
  const d = new Date(v as any);
  if (isNaN(d.getTime())) return new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
