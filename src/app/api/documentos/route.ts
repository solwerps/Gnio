// src/app/api/documentos/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const revalidate = 0;

// -----------------------------
// helpers iguales al masivo
// -----------------------------
function asBool(v: unknown): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (["si", "sí", "true", "1"].includes(s)) return true;
  if (["no", "false", "0"].includes(s)) return false;
  return null;
}

function asNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function asDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(v as any);
  return isNaN(d.getTime()) ? null : d;
}

// quita guiones y espacios al NIT
function normNit(n: unknown): string {
  return String(n ?? "")
    .replace(/[^0-9]/g, "")
    .trim();
}

// ✅ este es el que se guarda en la tabla (incluye empresa y operación)
function buildIdentificadorUnico(d: any) {
  return `${d.serie || ""}-${d.numero_dte || ""}-${d.numero_autorizacion || ""}-${d.empresa_id}-${d.operacion_tipo}`;
}

// Prisma create mapping (1 documento)
function mapToPrismaCreate(d: any) {
  return {
    identificadorUnico: buildIdentificadorUnico(d),

    fechaEmision: asDate(d.fecha_emision)!, // required
    numeroAutorizacion: d.numero_autorizacion ?? null,
    tipoDte: d.tipo_dte ?? "",
    serie: d.serie ?? null,
    numeroDte: d.numero_dte ?? "",
    nitEmisor: d.nit_emisor ?? null,
    nombreEmisor: d.nombre_emisor ?? null,
    codigoEstablecimiento: d.codigo_establecimiento ?? null,
    nombreEstablecimiento: d.nombre_establecimiento ?? null,
    idReceptor: d.id_receptor ?? null,
    nombreReceptor: d.nombre_receptor ?? null,
    nitCertificador: d.nit_certificador ?? null,
    nombreCertificador: d.nombre_certificador ?? null,
    moneda: d.moneda ?? "GTQ",

    montoTotal: new Prisma.Decimal(asNum(d.monto_total)),
    montoBien: new Prisma.Decimal(asNum(d.monto_bien)),
    montoServicio: new Prisma.Decimal(asNum(d.monto_servicio)),

    facturaEstado: d.factura_estado ?? null,
    marcaAnulado: asBool(d.marca_anulado),
    fechaAnulacion: asDate(d.fecha_anulacion),

    iva: d.iva == null ? null : new Prisma.Decimal(asNum(d.iva)),
    petroleo: d.petroleo == null ? null : new Prisma.Decimal(asNum(d.petroleo)),
    turismoHospedaje: d.turismo_hospedaje == null ? null : new Prisma.Decimal(asNum(d.turismo_hospedaje)),
    turismoPasajes: d.turismo_pasajes == null ? null : new Prisma.Decimal(asNum(d.turismo_pasajes)),
    timbrePrensa: d.timbre_prensa == null ? null : new Prisma.Decimal(asNum(d.timbre_prensa)),
    bomberos: d.bomberos == null ? null : new Prisma.Decimal(asNum(d.bomberos)),
    tasaMunicipal: d.tasa_municipal == null ? null : new Prisma.Decimal(asNum(d.tasa_municipal)),
    bebidasAlcoholicas: d.bebidas_alcoholicas == null ? null : new Prisma.Decimal(asNum(d.bebidas_alcoholicas)),
    tabaco: d.tabaco == null ? null : new Prisma.Decimal(asNum(d.tabaco)),
    cemento: d.cemento == null ? null : new Prisma.Decimal(asNum(d.cemento)),
    bebidasNoAlcoholicas: d.bebidas_no_alcoholicas == null ? null : new Prisma.Decimal(asNum(d.bebidas_no_alcoholicas)),
    tarifaPortuaria: d.tarifa_portuaria == null ? null : new Prisma.Decimal(asNum(d.tarifa_portuaria)),

    tipoOperacion: (d.operacion_tipo as any) ?? "venta",
    cuentaDebe: d.cuenta_debe ?? null,
    cuentaHaber: d.cuenta_haber ?? null,
    tipo: d.tipo ?? "bien",

    empresaId: Number(d.empresa_id),
    fechaTrabajo: asDate(d.date) || asDate(d.fecha_trabajo) || new Date(),
  };
}

// ======================================================================
// GET /api/documentos  → ya lo tenías, lo dejo tal cual pero añado solo
// un pequeño filtro de "todas" cuando operacion viene vacía
// ======================================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const empresaId = Number(searchParams.get("empresaId") || "0");
    const mes = String(searchParams.get("mes") || "");
    const operacion = String(searchParams.get("operacion") || "");
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "10")));
    const format = String(searchParams.get("format") || "");

    if (!empresaId || !/^\d{4}-\d{2}$/.test(mes)) {
      return NextResponse.json({ ok: false, error: "BAD_PARAMS" }, { status: 400 });
    }

    const [y, m] = mes.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);

    const where: any = { empresaId, fechaEmision: { gte: start, lt: end } };
    if (operacion === "compra" || operacion === "venta") {
      where.tipoOperacion = operacion;
    }

    const [total, data] = await Promise.all([
      prisma.documento.count({ where }),
      prisma.documento.findMany({
        where,
        orderBy: [{ fechaEmision: "desc" }, { numeroDte: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const rows = data.map((d) => ({
      uuid: d.uuid,
      fecha_emision: d.fechaEmision?.toISOString() ?? null,
      fecha_anulacion: d.fechaAnulacion?.toISOString() ?? null,
      importacion: false,
      numero_autorizacion: d.numeroAutorizacion ?? null,
      numero_dte: d.numeroDte,
      serie: d.serie ?? null,
      nit_emisor: d.nitEmisor ?? null,
      nombre_emisor: d.nombreEmisor ?? null,
      id_receptor: d.idReceptor ?? null,
      nombre_receptor: d.nombreReceptor ?? null,
      numero_de_establecimiento: d.codigoEstablecimiento ?? null,
      nombre_establecimiento: d.nombreEstablecimiento ?? null,
      nit_certificador: d.nitCertificador ?? null,
      nombre_certificador: d.nombreCertificador ?? null,
      moneda: d.moneda,
      monto_bien: Number(d.montoBien ?? 0),
      monto_servicio: Number(d.montoServicio ?? 0),
      iva: Number(d.iva ?? 0),
      petroleo: Number(d.petroleo ?? 0),
      turismo_hospedaje: Number(d.turismoHospedaje ?? 0),
      turismo_pasajes: Number(d.turismoPasajes ?? 0),
      timbre_prensa: Number(d.timbrePrensa ?? 0),
      bomberos: Number(d.bomberos ?? 0),
      tasa_municipal: Number(d.tasaMunicipal ?? 0),
      bebidas_alcoholicas: Number(d.bebidasAlcoholicas ?? 0),
      tabaco: Number(d.tabaco ?? 0),
      cemento: Number(d.cemento ?? 0),
      bebidas_no_alcoholicas: Number(d.bebidasNoAlcoholicas ?? 0),
      tarifa_portuaria: Number(d.tarifaPortuaria ?? 0),
      monto_total: Number(d.montoTotal ?? 0),
      factura_estado: d.facturaEstado ?? "",
      tipo_operacion: d.tipoOperacion as "compra" | "venta",
      tipo_dte: d.tipoDte,
      cuenta_debe: d.cuentaDebe ?? null,
      cuenta_haber: d.cuentaHaber ?? null,
      marca_anulado: Boolean(d.marcaAnulado),
      tipo: d.tipo ?? null,
    }));

    if (format === "csv") {
      const headers = Object.keys(rows[0] || {});
      const lines = [
        headers.join(","),
        ...rows.map((r) =>
          headers
            .map((h) => {
              const v = (r as any)[h];
              if (v === null || v === undefined) return "";
              const s = String(v).replace(/"/g, '""');
              return /[",\n]/.test(s) ? `"${s}"` : s;
            })
            .join(",")
        ),
      ];
      const csv = lines.join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=facturas_${empresaId}_${mes}.csv`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({ ok: true, data: { data: rows, total, page, pageSize } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

// ======================================================================
// POST /api/documentos  → crea UNA factura manual (como en Conta-cox)
// ======================================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // puede venir { documento: {...}, empresa_id, operacion_tipo, date }
    const empresaId = Number(body?.empresa_id ?? body?.empresaId);
    const operacion = (body?.operacion_tipo ?? body?.tipo_operacion) as "venta" | "compra" | undefined;
    const date = body?.date;

    // si viene como documento anidado
    const doc = body?.documento ? body.documento : body;

    if (!empresaId || !operacion || !doc) {
      return NextResponse.json(
        { ok: false, error: "MISSING_DATA (empresa_id, operacion_tipo, documento)" },
        { status: 400 }
      );
    }

    // 1) validar que exista empresa
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true, nit: true, nombre: true },
    });
    if (!empresa) {
      return NextResponse.json({ ok: false, error: "EMPRESA_NOT_FOUND" }, { status: 404 });
    }

    // 2) validar NIT igual que en masivo
    const nitEmpresa = normNit(empresa.nit);
    const nitDoc = normNit(doc.nit_emisor);
    if (!nitDoc || nitDoc !== nitEmpresa) {
      return NextResponse.json(
        {
          ok: false,
          error: `El NIT del documento (${doc.nit_emisor}) no coincide con la empresa (${empresa.nit})`,
        },
        { status: 400 }
      );
    }

    // 3) armar doc completo
    const full = {
      ...doc,
      empresa_id: empresaId,
      operacion_tipo: operacion,
      date,
    };

    // 4) revisar si ya existe igual que en masivo
    const identificadorUnico = buildIdentificadorUnico(full);
    const existente = await prisma.documento.findUnique({
      where: { identificadorUnico },
      select: { identificadorUnico: true },
    });
    if (existente) {
      return NextResponse.json(
        {
          ok: false,
          error: "DUPLICATED",
          message: "Este documento ya existe (serie + dte + autorizacion + empresa + operacion)",
        },
        { status: 409 }
      );
    }

    // 5) crear
    const created = await prisma.documento.create({
      data: mapToPrismaCreate(full),
    });

    return NextResponse.json({ ok: true, data: created });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "SERVER_ERROR" }, { status: 500 });
  }
}
