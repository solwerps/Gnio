// src/app/api/retenciones/iva/route.ts

// /src/app/api/retenciones/iva/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const revalidate = 0;

/**
 * GET /api/retenciones/iva?empresaId=5&fecha=YYYY-MM
 * También acepta empresa_id.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const empresaId =
      Number(searchParams.get("empresaId")) ||
      Number(searchParams.get("empresa_id"));

    const fecha = searchParams.get("fecha"); // "YYYY-MM"

    if (!empresaId) {
      return NextResponse.json(
        { status: 400, message: "empresa_id es requerido" },
        { status: 400 }
      );
    }

    const where: any = { empresaId };

    if (fecha && /^\d{4}-\d{2}$/.test(fecha)) {
      const [y, m] = fecha.split("-").map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      where.fechaTrabajo = { gte: start, lt: end };
    }

    const rows = await prisma.ivaRetencion.findMany({
      where,
      orderBy: [{ fechaEmision: "asc" }],
    });

    const data = rows.map((r) => ({
      uuid: r.uuid,
      empresaId: r.empresaId,
      fechaTrabajo: r.fechaTrabajo.toISOString(),
      nitRetenedor: r.nitRetenedor,
      nombreRetenedor: r.nombreRetenedor,
      estadoConstancia: r.estadoConstancia,
      constancia: r.constancia,
      fechaEmision: r.fechaEmision.toISOString(),
      totalFactura: Number(r.totalFactura),
      importeNeto: Number(r.importeNeto),
      afectoRetencion: Number(r.afectoRetencion),
      totalRetencion: Number(r.totalRetencion),
    }));

    return NextResponse.json({ status: 200, data }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/retenciones/iva error:", err);
    return NextResponse.json(
      { status: 500, message: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
