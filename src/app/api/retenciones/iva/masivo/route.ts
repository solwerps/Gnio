// src/app/api/retenciones/iva/masivo/route.ts
// /src/app/api/retenciones/iva/masivo/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

export const revalidate = 0;

// ----------------- helpers -----------------
const HEADER_MAP: Record<string, string> = {
  "NIT RETENEDOR": "NIT RETENEDOR",
  "NOMBRE RETENEDOR": "NOMBRE RETENEDOR",
  "ESTADO CONSTANCIA": "ESTADO CONSTANCIA",
  "CONSTANCIA": "CONSTANCIA",

  "FECHA EMISION": "FECHA EMISION",
  "FECHA EMISIÓN": "FECHA EMISION",

  "TOTAL FACTURA": "TOTAL FACTURA",
  "IMPORTE NETO": "IMPORTE NETO",

  "AFECTO RETENCION": "AFECTO RETENCION",
  "AFECTO RETENCIÓN": "AFECTO RETENCION",

  "TOTAL RETENCION": "TOTAL RETENCION",
  "TOTAL RETENCIÓN": "TOTAL RETENCION",
};

const canon = (k: string) => HEADER_MAP[k] ?? k;

function excelSerialToDate(n: number): Date {
  const epoch = new Date(Date.UTC(1899, 11, 30)); // 1900-based
  return new Date(epoch.getTime() + n * 86400000);
}

function parseFecha(val: any): Date {
  if (val == null || val === "") return new Date();
  if (typeof val === "number" && isFinite(val)) return excelSerialToDate(val);

  const s = String(val).trim();

  // dd/mm/yyyy
  const m1 = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m1) {
    const d = Number(m1[1]), m = Number(m1[2]), y = Number(m1[3]);
    return new Date(y, m - 1, d);
  }

  // yyyy-mm-dd
  const m2 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m2) {
    const y = Number(m2[1]), m = Number(m2[2]), d = Number(m2[3]);
    return new Date(y, m - 1, d);
  }

  const dflt = new Date(s);
  return isNaN(dflt.getTime()) ? new Date() : dflt;
}

function asNum(v: any): number {
  const n = Number(String(v ?? "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function getField(row: any, wanted: string) {
  const wantedCanon = canon(wanted);
  for (const k of Object.keys(row)) {
    if (canon(k) === wantedCanon) return row[k];
  }
  return undefined;
}

// ----------------- POST -----------------
/**
 * POST /api/retenciones/iva/masivo
 * body: { retenciones: any[], empresa_id: number, date: "YYYY-MM" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const empresaId = Number(body?.empresa_id);
    const retenciones = Array.isArray(body?.retenciones) ? body.retenciones : [];

    const fechaTrabajo =
      typeof body?.date === "string" && /^\d{4}-\d{2}$/.test(body.date)
        ? new Date(Number(body.date.slice(0, 4)), Number(body.date.slice(5, 7)) - 1, 1)
        : new Date();

    if (!empresaId) {
      return NextResponse.json(
        { status: 400, message: "empresa_id es requerido" },
        { status: 400 }
      );
    }
    if (!retenciones.length) {
      return NextResponse.json(
        { status: 400, message: "No hay retenciones para guardar" },
        { status: 400 }
      );
    }

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

    const data = retenciones.map((row: any) => {
      const nit = getField(row, "NIT RETENEDOR") ?? "";
      const nom = getField(row, "NOMBRE RETENEDOR") ?? "";
      const est = getField(row, "ESTADO CONSTANCIA") ?? "";
      const con = getField(row, "CONSTANCIA") ?? "";
      const fEm = getField(row, "FECHA EMISION");

      const totFac = asNum(getField(row, "TOTAL FACTURA"));
      const impNet = asNum(getField(row, "IMPORTE NETO"));
      const afeRet = asNum(getField(row, "AFECTO RETENCION"));
      const totRet = asNum(getField(row, "TOTAL RETENCION"));

      return {
        uuid: randomUUID(),
        empresaId,
        fechaTrabajo,
        nitRetenedor: String(nit),
        nombreRetenedor: String(nom),
        estadoConstancia: String(est),
        constancia: String(con),
        fechaEmision: parseFecha(fEm),
        totalFactura: new Prisma.Decimal(totFac),
        importeNeto: new Prisma.Decimal(impNet),
        afectoRetencion: new Prisma.Decimal(afeRet),
        totalRetencion: new Prisma.Decimal(totRet),
      };
    });

    await prisma.ivaRetencion.createMany({
      data,
      skipDuplicates: true,
    });

    return NextResponse.json(
      { status: 200, ok: true, inserted: data.length, message: "Retenciones guardadas correctamente" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST /api/retenciones/iva/masivo error:", err);
    return NextResponse.json(
      { status: 500, message: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
