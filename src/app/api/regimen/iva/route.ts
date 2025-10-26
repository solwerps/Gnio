// src/app/api/regimen/iva/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { REGIMEN_IVA_SEED } from "@/data/regimenIva.seed";
import { RegimenIvaFila } from "@/types/regimen-iva";
import { getSession } from "@/lib/auth";
import { requireSessionAndTenant } from "@/app/api/_utils/nomenclaturaTenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalize = (r: RegimenIvaFila, tenantId: number) => ({
  orden: r.orden,
  idRegimen: r.idRegimen,
  regimenSistema: r.regimenSistema,
  nombreRegimen: r.nombreRegimen,
  nombreComun: r.nombreComun,
  porcentajeIva: r.porcentajeIva,

  periodo: r.periodo,
  presentaAnual: r.presentaAnual,
  limiteSalarioActual: r.limiteSalarioActual,
  cantidadSalariosAnio: r.cantidadSalariosAnio,
  limiteFacturacionAnual: r.limiteFacturacionAnual,

  lugarVenta: r.lugarVenta,
  tipoActividad: r.tipoActividad,
  opcionSujetoRetencionIva: r.opcionSujetoRetencionIva,
  porcentajeRetencionIva: r.porcentajeRetencionIva,
  montoRetencionMayorIgual: r.montoRetencionMayorIgual,
  opcionExentoIva: r.opcionExentoIva,

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
  isSeed: false, // las filas del tenant SIEMPRE editables
});

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok:false, error:"UNAUTHORIZED" }, { status:401 });

    const auth = await requireSessionAndTenant(req);
    // ADMIN sin tenant: vista seed de solo lectura
    if ("error" in auth) {
      if (session.user?.role === "ADMIN") {
        return NextResponse.json({ ok:true, source:"SEED_ADMIN", data: REGIMEN_IVA_SEED });
      }
      return NextResponse.json({ ok:false, error: auth.error }, { status: auth.status });
    }

    const { tenant } = auth;
    const rows = await prisma.regimenIvaFila.findMany({
      where: { tenantId: tenant.id },
      orderBy: { orden: "asc" },
    });

    if (rows.length === 0) {
      return NextResponse.json({ ok:true, source:"SEED", data: REGIMEN_IVA_SEED });
    }
    return NextResponse.json({ ok:true, source:"TENANT_DB", data: rows });
  } catch (e) {
    console.error("GET /api/regimen/iva", e);
    return NextResponse.json({ ok:false, error:"LIST_FAILED" }, { status:500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok:false, error:"UNAUTHORIZED" }, { status:401 });

    const auth = await requireSessionAndTenant(req);
    if ("error" in auth) return NextResponse.json({ ok:false, error: auth.error }, { status: auth.status });
    const { tenant } = auth;

    const body = await req.json();
    const filas: RegimenIvaFila[] = Array.isArray(body?.filas) ? body.filas : [];
    // orden consistente
    const rows = filas.map((r, i) => ({ ...r, orden: Number(r.orden ?? i + 1) }));

    await prisma.$transaction(async (tx) => {
      await tx.regimenIvaFila.deleteMany({ where: { tenantId: tenant.id } });
      if (rows.length) {
        await tx.regimenIvaFila.createMany({ data: rows.map((r) => normalize(r, tenant.id)) });
      }
    });

    return NextResponse.json({ ok:true, total: rows.length });
  } catch (e) {
    console.error("PUT /api/regimen/iva", e);
    return NextResponse.json({ ok:false, error:"SAVE_FAILED" }, { status:500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok:false, error:"UNAUTHORIZED" }, { status:401 });

    const auth = await requireSessionAndTenant(req);
    if ("error" in auth) return NextResponse.json({ ok:false, error: auth.error }, { status: auth.status });
    const { tenant } = auth;

    await prisma.$transaction(async (tx) => {
      await tx.regimenIvaFila.deleteMany({ where: { tenantId: tenant.id } });
      await tx.regimenIvaFila.createMany({
        data: REGIMEN_IVA_SEED.map((r, i) =>
          normalize({ ...r, orden: Number(r.orden ?? i + 1) }, tenant.id)
        ),
      });
    });

    return NextResponse.json({ ok:true, reset:true, total: REGIMEN_IVA_SEED.length });
  } catch (e) {
    console.error("DELETE /api/regimen/iva", e);
    return NextResponse.json({ ok:false, error:"RESET_FAILED" }, { status:500 });
  }
}
