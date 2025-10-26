// src/app/api/nomenclaturas/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSessionAndTenant } from "../_utils/nomenclaturaTenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: lista de nomenclaturas por tenant
 * - Ordena por localId DESC
 * - Devuelve id = localId para que el front use IDs por-tenant (1..N)
 */
export async function GET(req: Request) {
  const auth = await requireSessionAndTenant(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { tenant } = auth;

  const list = await prisma.nomenclatura.findMany({
    where: { tenantId: tenant.id },
    orderBy: { localId: "desc" },
    select: { localId: true, nombre: true, descripcion: true, createdAt: true },
  });

  return NextResponse.json({
    ok: true,
    data: list.map((r) => ({
      id: r.localId,               // 👈 importante: el front usará este id
      nombre: r.nombre,
      descripcion: r.descripcion,
      createdAt: r.createdAt,
    })),
  });
}

/**
 * POST: crear nomenclatura dentro del tenant
 * - Calcula nextLocalId por tenant
 * - Guarda localId y devuelve id = localId
 */
export async function POST(req: Request) {
  const auth = await requireSessionAndTenant(req);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const { tenant, session } = auth;
  const body = await req.json();
  const { nombre, descripcion, versionGNIO, cuentas = [] } = body as any;

  if (!nombre) {
    return NextResponse.json({ ok: false, error: "BAD_PAYLOAD" }, { status: 400 });
  }

  // Siguiente consecutivo por tenant (1..N)
  const agg = await prisma.nomenclatura.aggregate({
    where: { tenantId: tenant.id },
    _max: { localId: true },
  });
  const nextLocalId = (agg._max.localId ?? 0) + 1;

  const normalize = (c: any, i: number) => ({
    orden: Number(c.orden ?? i + 1),
    cuenta: String(c.cuenta ?? ""),
    descripcion: String(c.descripcion ?? ""),
    debeHaber: c.debeHaber,
    principalDetalle: c.principalDetalle,
    nivel: Number(c.nivel ?? 1),
    tipo: c.tipo,
    naturaleza: c.naturaleza,
    lockCuenta: !!c.lockCuenta,
    lockDescripcion: !!c.lockDescripcion,
    lockDebeHaber: !!c.lockDebeHaber,
    lockPrincipalDetalle: !!c.lockPrincipalDetalle,
    lockNivel: !!c.lockNivel,
    lockTipo: !!c.lockTipo,
    lockNaturaleza: !!c.lockNaturaleza,
    lockAdd: c.lockAdd ?? (c.lockRowActions ?? true),
    lockDelete: c.lockDelete ?? (c.isPlantilla ? true : c.lockRowActions ?? true),
    isPlantilla: !!c.isPlantilla,
  });

  const created = await prisma.nomenclatura.create({
    data: {
      tenantId: tenant.id,
      ownerUserId: session.user.id,
      localId: nextLocalId,                // 👈 clave local por tenant
      nombre,
      descripcion,
      versionGNIO,
      cuentas: { create: (cuentas as any[]).map(normalize) },
    },
    select: { localId: true, _count: { select: { cuentas: true } } },
  });

  return NextResponse.json(
    { ok: true, id: created.localId, totalFilas: created._count.cuentas }, // 👈 devolver localId
    { status: 201 }
  );
}
