// src/app/api/nomenclaturas/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSessionAndTenant } from "../../_utils/nomenclaturaTenant";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Helpers enum <-> normalización
const toEnumToken = (v: any, fallback: string) => {
  if (typeof v !== "string" || !v.trim()) return fallback;
  return v.replaceAll(" ", "_").toUpperCase();
};

// Helper: obtiene la nomenclatura por tenant + localId
async function getNomByTenantLocalId(tenantId: number, localId: number) {
  return prisma.nomenclatura.findUnique({
    where: { tenantId_localId: { tenantId, localId } }, // <-- clave compuesta
    select: {
      id: true,            // id global interno (para relaciones)
      localId: true,       // consecutivo por tenant
      nombre: true,
      descripcion: true,
      versionGNIO: true,
      createdAt: true,
      updatedAt: true,
      cuentas: {
        orderBy: { orden: "asc" },
        select: {
          id: true,
          orden: true,
          cuenta: true,
          descripcion: true,
          debeHaber: true,           // "DEBE" | "HABER"
          principalDetalle: true,    // "P" | "D"
          nivel: true,
          tipo: true,                // "BALANCE_GENERAL" | "ESTADO_RESULTADOS" | "CAPITAL"
          naturaleza: true,          // ACTIVO | PASIVO | ... | OTROS_INGRESOS | OTROS_GASTOS | REVISAR
          lockCuenta: true,
          lockDescripcion: true,
          lockDebeHaber: true,
          lockPrincipalDetalle: true,
          lockNivel: true,
          lockTipo: true,
          lockNaturaleza: true,
          lockAdd: true,
          lockDelete: true,
          isPlantilla: true,
        },
      },
    },
  });
}

// GET /api/nomenclaturas/:id   (id = localId)
export async function GET(
  req: Request,
  ctx: { params: { id: string } }
) {
  try {
    const auth = await requireSessionAndTenant(req);
    if ("error" in auth) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }
    const { tenant } = auth;

    const { id } = ctx.params;
    const localId = Number(id);
    if (!localId || Number.isNaN(localId)) {
      return NextResponse.json({ ok: false, error: "BAD_ID" }, { status: 400 });
    }

    const nom = await getNomByTenantLocalId(tenant.id, localId);
    if (!nom) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ ok: true, data: nom });
  } catch (e) {
    console.error("GET /api/nomenclaturas/[id] error:", e);
    return NextResponse.json({ ok: false, error: "DETAIL_FAILED" }, { status: 500 });
  }
}

// PUT /api/nomenclaturas/:id   (id = localId)
export async function PUT(
  req: Request,
  ctx: { params: { id: string } }
) {
  try {
    const auth = await requireSessionAndTenant(req);
    if ("error" in auth) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }
    const { tenant } = auth;

    const { id } = ctx.params;
    const localId = Number(id);
    if (!localId || Number.isNaN(localId)) {
      return NextResponse.json({ ok: false, error: "BAD_ID" }, { status: 400 });
    }

    const body = await req.json();
    const { nombre, descripcion, cuentas = [] } = (body ?? {}) as {
      nombre?: string;
      descripcion?: string;
      cuentas?: any[];
    };

    // Verifica propiedad por tenant + localId y obtiene el id global
    const nom = await prisma.nomenclatura.findUnique({
      where: { tenantId_localId: { tenantId: tenant.id, localId } },
      select: { id: true },
    });
    if (!nom) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    const normalize = (c: any, i: number) => ({
      nomenclaturaId: nom.id, // usa id global para la relación
      orden: Number(c?.orden ?? i + 1),
      cuenta: String(c?.cuenta ?? ""),
      descripcion: String(c?.descripcion ?? ""),
      debeHaber: toEnumToken(c?.debeHaber ?? "DEBE", "DEBE"),
      principalDetalle: toEnumToken(c?.principalDetalle ?? "P", "P"),
      nivel: Number(c?.nivel ?? 1),
      tipo: toEnumToken(c?.tipo ?? "BALANCE_GENERAL", "BALANCE_GENERAL"),
      naturaleza: toEnumToken(c?.naturaleza ?? "REVISAR", "REVISAR"),
      lockCuenta: !!c?.lockCuenta,
      lockDescripcion: !!c?.lockDescripcion,
      lockDebeHaber: !!c?.lockDebeHaber,
      lockPrincipalDetalle: !!c?.lockPrincipalDetalle,
      lockNivel: !!c?.lockNivel,
      lockTipo: !!c?.lockTipo,
      lockNaturaleza: !!c?.lockNaturaleza,
      lockAdd: typeof c?.lockAdd === "boolean" ? c.lockAdd : !!c?.lockRowActions,
      lockDelete:
        typeof c?.lockDelete === "boolean"
          ? c.lockDelete
          : (c?.isPlantilla ? true : !!c?.lockRowActions),
      isPlantilla: !!c?.isPlantilla,
    });

    await prisma.$transaction(async (tx) => {
      await tx.nomenclatura.update({
        where: { id: nom.id },
        data: {
          nombre: typeof nombre === "string" ? nombre : undefined,
          descripcion: typeof descripcion === "string" ? descripcion : undefined,
        },
      });

      await tx.nomenclaturaCuenta.deleteMany({ where: { nomenclaturaId: nom.id } });

      if (Array.isArray(cuentas) && cuentas.length > 0) {
        // createMany ignora valores undefined; ya normalizamos todo
        await tx.nomenclaturaCuenta.createMany({ data: cuentas.map(normalize) });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("PUT /api/nomenclaturas/[id] error:", e?.code || e);
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED" }, { status: 500 });
  }
}

// DELETE /api/nomenclaturas/:id   (id = localId)
export async function DELETE(
  req: Request,
  ctx: { params: { id: string } }
) {
  try {
    const auth = await requireSessionAndTenant(req);
    if ("error" in auth) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }
    const { tenant } = auth;

    const { id } = ctx.params;
    const localId = Number(id);
    if (!localId || Number.isNaN(localId)) {
      return NextResponse.json({ ok: false, error: "BAD_ID" }, { status: 400 });
    }

    const nom = await prisma.nomenclatura.findUnique({
      where: { tenantId_localId: { tenantId: tenant.id, localId } },
      select: { id: true },
    });
    if (!nom) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.nomenclaturaCuenta.deleteMany({ where: { nomenclaturaId: nom.id } });
      await tx.nomenclatura.delete({ where: { id: nom.id } });
    });

    return NextResponse.json({ ok: true, deletedLocalId: localId });
  } catch (e) {
    console.error("DELETE /api/nomenclaturas/[id] error:", e);
    return NextResponse.json({ ok: false, error: "DELETE_FAILED" }, { status: 500 });
  }
}
