// app/api/documentos/preview/route.ts
import { NextResponse } from 'next/server';

/**
 * POST /api/documentos/preview
 * Body: { empresaId: number, op: 'compra'|'venta', period: 'YYYY-MM', items: ParsedItem[] }
 * - Aquí SOLO validas y devuelves preview con mensajes/errores.
 * - No inserta en BD.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { empresaId, op, period, items } = body || {};
    if (!empresaId || !period) {
      return NextResponse.json({ status: 400, ok: false, message: 'empresaId y period son requeridos' });
    }
    if (op !== 'compra' && op !== 'venta') {
      return NextResponse.json({ status: 400, ok: false, message: 'op inválido' });
    }

    // Valida estructuras mínimas (ejemplo). Ajusta según tu parser Excel/XML.
    const preview = (items ?? []).map((it: any, i: number) => ({
      index: i,
      ok: true,
      warnings: [],
      errors: [],
      ...it,
    }));

    return NextResponse.json({ status: 200, ok: true, preview });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ status: 500, ok: false, message: err?.message ?? 'Error' });
  }
}
