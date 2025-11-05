// src/app/api/documentos/rectificar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function asDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(v as any);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const empresaId = Number(body?.empresa_id);
    const operacion = body?.operacion_tipo as "venta" | "compra" | undefined;

    // ⬇️ ESTA ES LA FECHA QUE SE RECTIFICA
    const fechaEmisionNueva = asDate(body?.fecha_emision);

    const documentos = Array.isArray(body?.documentos) ? body.documentos : [];

    const cuentaDebe  = body?.cuenta_debe  ?? null;
    const cuentaDebe2 = body?.cuenta_debe2 ?? null;
    const cuentaHaber = body?.cuenta_haber ?? null;

    if (!empresaId || !documentos.length) {
      return NextResponse.json(
        { status: 400, message: "Faltan datos (empresa_id, documentos[])" },
        { status: 400 }
      );
    }

    // Validar empresa
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true },
    });
    if (!empresa) {
      return NextResponse.json(
        { status: 404, message: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    // Construir updates (SOLO lo pedido)
    const ops = documentos
      .map((d: any) => {
        const uuid = String(d?.uuid || "");
        if (!uuid) return null;

        const data: any = {};

        // Cambiar fecha de emisión (obligatoria para mover de mes)
        if (fechaEmisionNueva) data.fechaEmision = fechaEmisionNueva;

        // Cambiar operación si te interesa (opcional)
        if (operacion) data.tipoOperacion = operacion;

        // Cambiar cuentas (opcionales, solo si vienen)
        if (cuentaDebe  !== null) data.cuentaDebe  = cuentaDebe;
        if (cuentaDebe2 !== null) data.cuentaDebe2 = cuentaDebe2;
        if (cuentaHaber !== null) data.cuentaHaber = cuentaHaber;

        // ❌ Nada de anular, ni fechaAnulacion, ni deleted.
        // ❌ No tocamos fechaTrabajo aquí.

        return prisma.documento.update({
          where: { uuid },
          data,
        });
      })
      .filter(Boolean) as any[];

    if (!ops.length) {
      return NextResponse.json(
        { status: 400, message: "No hay documentos válidos para actualizar" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(ops, { timeout: 60_000 });

    return NextResponse.json(
      {
        status: 200,
        ok: true,
        updated: result.length,
        message: "Documentos rectificados correctamente",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST /api/documentos/rectificar error:", err);
    return NextResponse.json(
      { status: 500, message: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
