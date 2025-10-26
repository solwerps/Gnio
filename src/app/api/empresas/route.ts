// /src/app/api/empresas/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Evita caching agresivo
export const revalidate = 0;

/**
 * GET /api/empresas
 * Devuelve un listado simple para la tabla de Empresas.
 * NO usa params.id aquí (esto es la ruta "colección").
 */
export async function GET() {
  const empresas = await prisma.empresa.findMany({
    select: {
      id: true,
      nombre: true,
      nit: true,
      sectorEconomico: true,
    },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(empresas);
}

/**
 * Si NO usas creación por esta ruta, puedes borrar este POST.
 * Lo dejo vacío para no romper imports que lo esperen.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  // … tu lógica real de crear empresa (si la tienes) …
  return NextResponse.json({ ok: true, received: body });
}
