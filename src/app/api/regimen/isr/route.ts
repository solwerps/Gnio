// src/app/api/regimen/isr/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireSessionAndTenant } from "@/app/api/_utils/nomenclaturaTenant";
import { REGIMEN_ISR_SEED } from "@/data/regimenIsr.seed";
import type { RegimenIsrFila } from "@/types/regimen-isr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalize = (r: RegimenIsrFila, tenantId: number) => ({
  orden: r.orden,
  idRegimen: r.idRegimen,
  regimenSistema: r.regimenSistema,
  nombreRegimen: r.nombreRegimen,
  nombreComun: r.nombreComun,
  porcentajeIsr: r.porcentajeIsr,
  paraIsrDe: r.paraIsrDe,
  hastaIsrDe: r.hastaIsrDe,

  periodo: r.periodo,
  presentaAnual: r.presentaAnual,
  limiteSalarioActual: r.limiteSalarioActual,
  cantidadSalariosAnio: r.cantidadSalariosAnio,
  limiteFacturacionAnual: r.limiteFacturacionAnual,

  lugarVenta: r.lugarVenta,
  tipoActividad: r.tipoActividad,
  opcionSujetoRetencionIsr: r.opcionSujetoRetencionIsr,

  presentaFacturas: r.presentaFacturas,
  retencionIva: r.retencionIva,
  retencionIsr: r.retencionIsr,
  presentanIso: r.presentanIso,
  presentaInventarios: r.presentaInventarios,
  libroCompras: r.libroCompras,
  libroVentas: r.libroVentas,
  libroDiario: r.libroDiario,
  libroDiarioDetalle: r.libroDiarioDetalle,
  libroMayor: r.libroMayor,
  balanceGeneralEstadoResult: r.balanceGeneralEstadoResult,
  estadosFinancieros: r.estadosFinancieros,
  conciliacionBancaria: r.conciliacionBancaria,
  asientoContable: r.asientoContable,

  tenantId,
  isSeed: false, // filas del tenant siempre editables
});

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const auth = await requireSessionAndTenant(req);

    // ADMIN sin tenant: vista seed de solo lectura
    if ("error" in auth) {
      if (session.user?.role === "ADMIN") {
        return NextResponse.json({ ok: true, source: "SEED_ADMIN", data: REGIMEN_ISR_SEED });
      }
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const { tenant } = auth;
    const rows = await prisma.regimenIsrFila.findMany({
      where: { tenantId: tenant.id },
      orderBy: { orden: "asc" },
    });

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, source: "SEED", data: REGIMEN_ISR_SEED });
    }

    return NextResponse.json({ ok: true, source: "TENANT_DB", data: rows });
  } catch (e) {
    console.error("GET /api/regimen/isr", e);
    return NextResponse.json({ ok: false, error: "LIST_FAILED" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const auth = await requireSessionAndTenant(req);
    if ("error" in auth) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    const { tenant } = auth;
    const body = await req.json();
    const filas: RegimenIsrFila[] = Array.isArray(body?.filas) ? body.filas : [];

    // orden consistente
    const rows = filas.map((r, i) => ({ ...r, orden: Number(r.orden ?? i + 1) }));

    await prisma.$transaction(async (tx) => {
      await tx.regimenIsrFila.deleteMany({ where: { tenantId: tenant.id } });
      if (rows.length) {
        await tx.regimenIsrFila.createMany({
          data: rows.map((r) => normalize(r, tenant.id)),
        });
      }
    });

    return NextResponse.json({ ok: true, total: rows.length });
  } catch (e) {
    console.error("PUT /api/regimen/isr", e);
    return NextResponse.json({ ok: false, error: "SAVE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const auth = await requireSessionAndTenant(req);
    if ("error" in auth) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    const { tenant } = auth;

    await prisma.$transaction(async (tx) => {
      await tx.regimenIsrFila.deleteMany({ where: { tenantId: tenant.id } });
      await tx.regimenIsrFila.createMany({
        data: REGIMEN_ISR_SEED.map((r, i) => normalize({ ...r, orden: Number(r.orden ?? i + 1) }, tenant.id)),
      });
    });

    return NextResponse.json({ ok: true, reset: true, total: REGIMEN_ISR_SEED.length });
  } catch (e) {
    console.error("DELETE /api/regimen/isr", e);
    return NextResponse.json({ ok: false, error: "RESET_FAILED" }, { status: 500 });
  }
}
