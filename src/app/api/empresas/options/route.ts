//src/app/api/empresas/options/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Evita caching agresivo
export const revalidate = 0;

/**
 * GET /api/empresas/options
 * Devuelve opciones para selects en UI (id, nombre, nit y, si existen, cuentas default).
 * Respeta tu clasificación de “entornos contables” porque solo LEE Empresa.
 */
export async function GET() {
  // Ajusta los campos si en tu esquema se llaman distinto.
  const empresas = await prisma.empresa.findMany({
    select: {
      id: true,
      nombre: true,
      nit: true,
      // Si en tu esquema guardas defaults, exponlos:
      cuentaDebeDefault: true,     // <-- cambia si se llama diferente o elimínalo si no existe
      cuentaHaberDefault: true,    // <-- idem
    },
    orderBy: { nombre: "asc" },
  });

  const data = empresas.map((e) => ({
    value: String(e.id),
    label: e.nombre,
    nit: e.nit,
    // mantengo null si tus campos no existen
    cuenta_debe: (e as any).cuentaDebeDefault ?? null,
    cuenta_haber: (e as any).cuentaHaberDefault ?? null,
  }));

  return NextResponse.json({ status: 200, data });
}
