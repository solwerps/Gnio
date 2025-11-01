// ==============================================
// PATH: src/app/api/empresas/[id]/nomenclatura/route.ts
// (NUEVO archivo de API para resolver la nomenclatura de la empresa)
// ==============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSessionAndTenant } from "../../../_utils/nomenclaturaTenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/empresas/:id/nomenclatura
 * Responde: { ok: true, nomenclaturaLocalId: number | null }
 *
 * Soporta que afiliaciones.nomenclaturaId sea ID GLOBAL o localId,
 * siempre validando por tenant.
 */
export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const auth = await requireSessionAndTenant(req);
    if ("error" in auth) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }
    const { tenant } = auth;

    const empresaId = Number(ctx.params.id);
    if (!empresaId || Number.isNaN(empresaId)) {
      return NextResponse.json({ ok: false, error: "BAD_ID" }, { status: 400 });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { afiliaciones: true },
    });
    if (!empresa) {
      return NextResponse.json({ ok: false, error: "EMPRESA_NOT_FOUND" }, { status: 404 });
    }

    const ref = empresa.afiliaciones?.nomenclaturaId ?? null;
    if (!ref) {
      return NextResponse.json({ ok: true, nomenclaturaLocalId: null });
    }

    const asNumber = Number(ref);
    let localId: number | null = null;

    // 1) Intentar como ID GLOBAL
    if (!Number.isNaN(asNumber)) {
      const byGlobal = await prisma.nomenclatura.findUnique({
        where: { id: asNumber },
        select: { localId: true, tenantId: true },
      });
      if (byGlobal && byGlobal.tenantId === tenant.id) {
        localId = byGlobal.localId;
      }
    }

    // 2) Intentar como localId (por tenant)
    if (localId == null && !Number.isNaN(asNumber)) {
      const byLocal = await prisma.nomenclatura.findUnique({
        where: { tenantId_localId: { tenantId: tenant.id, localId: asNumber } },
        select: { localId: true },
      });
      localId = byLocal?.localId ?? null;
    }

    return NextResponse.json({ ok: true, nomenclaturaLocalId: localId });
  } catch (e) {
    console.error("GET /api/empresas/[id]/nomenclatura error:", e);
    return NextResponse.json({ ok: false, error: "RESOLVE_NOMENCLATURA_FAILED" }, { status: 500 });
  }
}
