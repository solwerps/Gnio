// src/app/api/tareas/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// helper: valida que el usuario pertenece al tenant (slug)
async function getTenantForUser(tenantSlug: string | null, userId: number) {
  if (!tenantSlug) return null;
  return prisma.tenant.findFirst({
    where: { slug: tenantSlug, memberships: { some: { userId } } },
  });
}

// GET /api/tareas?tenant=slug
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tenantSlug = searchParams.get("tenant");
  const tenant = await getTenantForUser(tenantSlug, session.user.id);
  if (!tenant) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const tareas = await prisma.tarea.findMany({
    where: { tenantId: tenant.id, userId: session.user.id },
    orderBy: [{ estado: "asc" }, { fecha: "asc" }, { id: "asc" }],
  });

  return NextResponse.json({ ok: true, data: tareas });
}

// POST /api/tareas  { tenant, tarea }
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json();
  const tenantSlug = body?.tenant as string | undefined;
  const tarea = body?.tarea;

  const tenant = await getTenantForUser(tenantSlug ?? null, session.user.id);
  if (!tenant) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const created = await prisma.tarea.create({
    data: {
      tenantId: tenant.id,
      userId: session.user.id,
      titulo: String(tarea?.titulo ?? "").slice(0, 255),
      estado: tarea?.estado ?? "PENDIENTE",
      tipo: tarea?.tipo ?? null,
      fecha: tarea?.fecha ? new Date(tarea.fecha) : null,
      recordatorio: !!tarea?.recordatorio,
      empresa: tarea?.empresa ?? null,
    },
  });

  return NextResponse.json({ ok: true, data: created });
}

// PUT /api/tareas  { tenant, id, patch }
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json();
  const tenantSlug = body?.tenant as string | undefined;
  const id = Number(body?.id);
  const patch = body?.patch ?? {};

  const tenant = await getTenantForUser(tenantSlug ?? null, session.user.id);
  if (!tenant) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  // seguridad: sólo toca tareas del mismo usuario y tenant
  const exists = await prisma.tarea.findFirst({
    where: { id, tenantId: tenant.id, userId: session.user.id },
  });
  if (!exists) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const updated = await prisma.tarea.update({
    where: { id },
    data: {
      titulo: patch.titulo ?? undefined,
      estado: patch.estado ?? undefined,
      tipo: patch.tipo ?? undefined,
      fecha: patch.fecha ? new Date(patch.fecha) : patch.fecha === null ? null : undefined,
      recordatorio: typeof patch.recordatorio === "boolean" ? patch.recordatorio : undefined,
      empresa: patch.empresa ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, data: updated });
}

// DELETE /api/tareas  { tenant, id }
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json();
  const tenantSlug = body?.tenant as string | undefined;
  const id = Number(body?.id);

  const tenant = await getTenantForUser(tenantSlug ?? null, session.user.id);
  if (!tenant) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  // seguridad
  const exists = await prisma.tarea.findFirst({
    where: { id, tenantId: tenant.id, userId: session.user.id },
  });
  if (!exists) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  await prisma.tarea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
