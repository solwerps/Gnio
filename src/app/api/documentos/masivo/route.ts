// src/app/api/documentos/masivo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// ------------------ helpers ------------------
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

// 🆕 este es para comparar entre empresas/meses (sin empresa y sin operación)
function buildLlaveGlobal(d: any) {
  return `${d.serie || ""}-${d.numero_dte || ""}-${d.numero_autorizacion || ""}`.toUpperCase();
}

// mapeo para create
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

    // enum en tu schema
    tipoOperacion: (d.operacion_tipo as any) ?? "venta",
    cuentaDebe: d.cuenta_debe ?? null,
    cuentaHaber: d.cuenta_haber ?? null,
    tipo: d.tipo ?? "bien",

    empresaId: Number(d.empresa_id),
    fechaTrabajo: asDate(d.date) || asDate(d.fecha_trabajo) || new Date(),
  };
}

// mapeo para update
function mapToPrismaUpdate(d: any) {
  return {
    fechaEmision: asDate(d.fecha_emision) ?? undefined,
    montoTotal: new Prisma.Decimal(asNum(d.monto_total)),
    montoBien: new Prisma.Decimal(asNum(d.monto_bien)),
    montoServicio: new Prisma.Decimal(asNum(d.monto_servicio)),

    iva: d.iva == null ? undefined : new Prisma.Decimal(asNum(d.iva)),
    petroleo: d.petroleo == null ? undefined : new Prisma.Decimal(asNum(d.petroleo)),
    turismoHospedaje: d.turismo_hospedaje == null ? undefined : new Prisma.Decimal(asNum(d.turismo_hospedaje)),
    turismoPasajes: d.turismo_pasajes == null ? undefined : new Prisma.Decimal(asNum(d.turismo_pasajes)),

    tipo: d.tipo ?? undefined,
    cuentaDebe: d.cuenta_debe ?? undefined,
    cuentaHaber: d.cuenta_haber ?? undefined,

    facturaEstado: d.factura_estado ?? undefined,
    marcaAnulado: asBool(d.marca_anulado) ?? undefined,
    fechaAnulacion: asDate(d.fecha_anulacion) ?? undefined,
  };
}

function formatPeriodo(d?: Date | null) {
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// ------------------ handler ------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const empresaId = Number(body?.empresa_id || body?.empresaId);
    const operacion = body?.operacion_tipo as "venta" | "compra" | undefined;
    const date = body?.date;
    const documentos = Array.isArray(body?.documentos) ? body.documentos : [];

    if (!empresaId || !operacion || documentos.length === 0) {
      return NextResponse.json(
        { status: 400, message: "Faltan datos requeridos (empresa_id, operacion_tipo, documentos)" },
        { status: 400 }
      );
    }

    // 1) empresa para validar NIT
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true, nombre: true, nit: true },
    });
    if (!empresa) {
      return NextResponse.json(
        { status: 404, message: `No existe la empresa con id ${empresaId}` },
        { status: 404 }
      );
    }
    const nitEmpresa = normNit(empresa.nit);

    // 2) agregamos contexto a cada doc
    const docsWithContext = documentos.map((d: any) => ({
      ...d,
      empresa_id: empresaId,
      operacion_tipo: operacion,
      date,
      _llaveGlobal: buildLlaveGlobal(d),
    }));

    // 3) validar NIT iguales
    const nitMalos = docsWithContext.filter((d) => {
      const nitDoc = normNit(d.nit_emisor);
      return !nitDoc || nitDoc !== nitEmpresa;
    });

    if (nitMalos.length > 0) {
      return NextResponse.json(
        {
          status: 400,
          message: `El NIT de estas facturas no coincide con el de la empresa (${empresa.nit}): ${nitMalos
            .map((d) => `${d.serie || ""}-${d.numero_dte || ""}`)
            .join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 4) buscar duplicados ya guardados (mismo serie + numero_dte + numero_autorizacion)
    const whereOR = docsWithContext.map((d: any) => {
      const and: any[] = [
        { numeroDte: d.numero_dte ?? "" },
      ];

      if (d.serie) and.push({ serie: d.serie });
      else and.push({ serie: null });

      if (d.numero_autorizacion) and.push({ numeroAutorizacion: d.numero_autorizacion });
      else and.push({ numeroAutorizacion: null });

      return { AND: and };
    });

    const existentes = await prisma.documento.findMany({
      where: { OR: whereOR },
      select: {
        identificadorUnico: true,
        serie: true,
        numeroDte: true,
        numeroAutorizacion: true,
        empresaId: true,
        nitEmisor: true,
        fechaTrabajo: true,
      },
    });

    // 🧠 si hay EXISTENTES → NO guardamos NADA y devolvemos info
    if (existentes.length > 0) {
      // armamos mensajes bonitos
      const detalles = existentes.map((e) => {
        return {
          serie: e.serie,
          numeroDte: e.numeroDte,
          numeroAutorizacion: e.numeroAutorizacion,
          empresaId: e.empresaId,
          nitEmisor: e.nitEmisor,
          periodo: formatPeriodo(e.fechaTrabajo),
        };
      });

      return NextResponse.json(
        {
          status: 409,
          message: `Se encontraron ${existentes.length} factura(s) que ya habían sido cargadas. No se guardó nada.`,
          duplicadas: detalles,
        },
        { status: 409 }
      );
    }

    // 5) si NO hay duplicados → ahora sí guardamos / actualizamos
    const ops = docsWithContext.map((d: any) => {
      const identificadorUnico = buildIdentificadorUnico(d);
      return prisma.documento.upsert({
        where: { identificadorUnico },
        create: mapToPrismaCreate(d),
        update: mapToPrismaUpdate(d),
      });
    });

    const result = await prisma.$transaction(ops, { timeout: 60_000 });

    return NextResponse.json(
      {
        status: 200,
        ok: true,
        count: result.length,
        message: "Documentos procesados correctamente",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { status: 500, message: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
