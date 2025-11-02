// 📄 src/app/api/empresas/[id]/nomenclatura/route.ts
// ==================================================
// GET /api/empresas/:id/nomenclatura
// Devuelve la nomenclatura (localId) que tiene afiliada esa empresa,
// pero **validando** que pertenezca al tenant actual.
// ==================================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSessionAndTenant } from "../../../_utils/nomenclaturaTenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Respuesta esperada:
 *  - { ok: true, nomenclaturaLocalId: number | null }
 *  - { ok: false, error: string }
 *
 * Notas:
 *  - En Afiliaciones se guarda `nomenclaturaId`, pero a veces es el **id global**
 *    de la tabla `Nomenclatura` y a veces tú lo usas como **localId por tenant**.
 *    Por eso este endpoint prueba las dos formas.
 *  - Si la empresa no tiene afiliación o no tiene nomenclatura -> devuelve null.
 *
 * IMPORTANTE (cambio de hoy):
 *  Next 15 ahora pasa `ctx.params` como una **promesa**, así que
 *  hay que hacer: `const { id } = await ctx.params;`
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    // 1. resolver params (NUEVO)
    const { id } = await ctx.params;

    // 2. validar parámetro
    const empresaId = Number(id);
    if (!empresaId || Number.isNaN(empresaId)) {
      return NextResponse.json(
        { ok: false, error: "BAD_ID" },
        { status: 400 }
      );
    }

    // 3. validar sesión + tenant (LO ANTERIOR SE MANTIENE)
    const auth = await requireSessionAndTenant(req);
    if ("error" in auth) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }
    const { tenant } = auth;

    // 4. traer empresa + afiliaciones
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { afiliaciones: true },
    });

    if (!empresa) {
      return NextResponse.json(
        { ok: false, error: "EMPRESA_NOT_FOUND" },
        { status: 404 }
      );
    }

    // si no tiene afiliaciones o no tiene nomenclatura -> devolvemos null
    const ref = empresa.afiliaciones?.nomenclaturaId ?? null;
    if (!ref) {
      return NextResponse.json({ ok: true, nomenclaturaLocalId: null });
    }

    // 5. aquí viene la parte "inteligente":
    //    puede ser un ID global o puede ser un localId
    const asNumber = Number(ref);
    let localId: number | null = null;

    // 5.a) Intentar como ID GLOBAL de Nomenclatura
    if (!Number.isNaN(asNumber)) {
      const byGlobal = await prisma.nomenclatura.findUnique({
        where: { id: asNumber },
        select: { localId: true, tenantId: true },
      });

      // solo lo aceptamos si ES del tenant actual
      if (byGlobal && byGlobal.tenantId === tenant.id) {
        localId = byGlobal.localId;
      }
    }

    // 5.b) Si todavía no lo resolvimos, intentamos como localId por tenant
    if (localId == null && !Number.isNaN(asNumber)) {
      const byLocal = await prisma.nomenclatura.findUnique({
        where: {
          tenantId_localId: {
            tenantId: tenant.id,
            localId: asNumber,
          },
        },
        select: { localId: true },
      });

      localId = byLocal?.localId ?? null;
    }

    // 6. responder
    return NextResponse.json({ ok: true, nomenclaturaLocalId: localId });
  } catch (e) {
    console.error("GET /api/empresas/[id]/nomenclatura error:", e);
    return NextResponse.json(
      { ok: false, error: "RESOLVE_NOMENCLATURA_FAILED" },
      { status: 500 }
    );
  }
}
