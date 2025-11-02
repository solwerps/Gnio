// /src/app/api/empresas/route.ts
import { NextResponse } from "next/server";
import type { RazonSocial as PrismaRazonSocial } from "@prisma/client";
import prisma from "@/lib/prisma";

// Evita caching agresivo
export const revalidate = 0;

/**
 * Helper: convierte "dd/mm/yyyy" a Date | null
 */
function parseDMY(d?: string | null): Date | null {
  if (!d) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d.trim());
  if (!m) return null;

  const dd = Number(m[1]);
  const mm = Number(m[2]) - 1;
  const yyyy = Number(m[3]);

  const dt = new Date(yyyy, mm, dd);
  // validar que la fecha exista
  if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm || dt.getDate() !== dd) return null;
  return dt;
}

/**
 * Helper: acepta Date | string | number y devuelve Date | null
 */
function coerceDate(value: unknown): Date | null {
  // ya es Date
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  // string
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // primero intentamos dd/mm/yyyy
    const parsedDMY = parseDMY(trimmed);
    if (parsedDMY) return parsedDMY;

    // luego intentamos Date.parse
    const ts = Date.parse(trimmed);
    return Number.isNaN(ts) ? null : new Date(ts);
  }

  // timestamp
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Helper: número seguro
 */
function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * GET /api/empresas
 * Lista empresas (opcionalmente filtradas por tenant ?tenant=...).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenant = searchParams.get("tenant")?.trim();

    const empresas = await prisma.empresa.findMany({
      where: tenant ? { tenant } : undefined,
      select: {
        id: true,
        nombre: true,
        nit: true,
        sectorEconomico: true,
      },
      orderBy: { id: "desc" },
    });

    return NextResponse.json(empresas);
  } catch (err) {
    console.error("GET empresas error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/empresas
 * Crea una empresa y, si vienen en el body, también:
 * - afiliaciones (+ obligaciones)
 * - gestiones (+ folios de libros)
 * - cuentas bancarias
 * Todo dentro de UNA transacción para que no se pierdan los IDs.
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantQuery = searchParams.get("tenant")?.trim();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
    }

    const {
      tenant: tenantBody,
      nombre,
      nit,
      sectorEconomico,
      razonSocial,
      avatarUrl,
      info,
      afiliaciones,
      gestiones,
      cuentasBancarias,
    } = body as Record<string, any>;

    // prioridad: ?tenant=... luego body.tenant
    const tenant = (tenantQuery || tenantBody)?.toString().trim();
    if (!tenant) {
      return NextResponse.json({ ok: false, error: "TENANT_REQUIRED" }, { status: 400 });
    }

    const nombreSafe = typeof nombre === "string" ? nombre.trim() : "";
    const nitSafe = typeof nit === "string" ? nit.trim() : "";
    const sectorSafe = typeof sectorEconomico === "string" ? sectorEconomico.trim() : "";
    const razon =
      razonSocial === "Juridico"
        ? "Juridico"
        : razonSocial === "Individual"
        ? "Individual"
        : "";

    if (!nombreSafe || !nitSafe || !sectorSafe || !razon) {
      return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    }

    const razonEnum = razon as PrismaRazonSocial;

    // infoExtra según tipo de razón social
    const infoPayload = info && typeof info === "object" ? info : null;
    const infoIndividual =
      infoPayload?.tipo === "Individual"
        ? infoPayload
        : razonEnum === "Individual"
        ? infoPayload ?? null
        : null;

    const infoJuridico =
      infoPayload?.tipo === "Juridico"
        ? infoPayload
        : razonEnum === "Juridico"
        ? infoPayload ?? null
        : null;

    // ---- afiliaciones.obligaciones
    const obligaciones = Array.isArray(afiliaciones?.obligaciones)
      ? afiliaciones.obligaciones.map((o: any) => ({
          impuesto: String(o?.impuesto || "Otro"),
          codigoFormulario: o?.codigoFormulario ? String(o.codigoFormulario) : null,
          fechaPresentacion: coerceDate(o?.fechaPresentacion),
          nombreObligacion: o?.nombreObligacion ? String(o.nombreObligacion) : null,
        }))
      : [];

    // ---- gestiones.folios
    const folios = Array.isArray(gestiones?.folios)
      ? gestiones.folios.map((f: any) => ({
          libro: String(f?.libro ?? ""),
          disponibles: toNumber(f?.disponibles),
          usados: toNumber(f?.usados),
          ultimaFecha: coerceDate(f?.ultimaFecha),
        }))
      : [];

    // ---- cuentas bancarias
    const cuentas = Array.isArray(cuentasBancarias)
      ? cuentasBancarias
          .map((c: any) => ({
            numero: String(c?.numero ?? "").trim(),
            banco: String(c?.banco ?? "").trim(),
            descripcion: c?.descripcion ? String(c.descripcion) : null,
            moneda: String(c?.moneda ?? "GTQ") || "GTQ",
            saldoInicial: toNumber(c?.saldoInicial),
            cuentaContableId: c?.cuentaContableId ? Number(c.cuentaContableId) : null,
          }))
          // quitamos vacíos
          .filter((c: any) => c.numero || c.banco || c.descripcion)
      : [];

    // === TRANSACCIÓN ===
    const created = await prisma.$transaction(async (tx) => {
      // 1) Crear empresa base
      const empresa = await tx.empresa.create({
        data: {
          tenant,
          nombre: nombreSafe,
          nit: nitSafe,
          sectorEconomico: sectorSafe,
          razonSocial: razonEnum,
          avatarUrl: avatarUrl ? String(avatarUrl) : null,
          infoIndividual: infoIndividual ?? null,
          infoJuridico: infoJuridico ?? null,
        },
      });

      // aquí vamos a ir guardando los IDs para luego actualizar la empresa
      const updateEmpresaData: { afiliacionesId?: number | null; gestionesId?: number | null } = {};

      // 2) Afiliaciones (si vienen)
      if (afiliaciones) {
        const afili = await tx.afiliaciones.create({
          data: {
            regimenIvaId: afiliaciones?.regimenIvaId ?? null,
            regimenIsrId: afiliaciones?.regimenIsrId ?? null,
            nomenclaturaId: afiliaciones?.nomenclaturaId ?? null,
          },
        });

        updateEmpresaData.afiliacionesId = afili.id;

        // 2.1) Obligaciones de esa afiliación
        if (obligaciones.length) {
          await tx.obligacion.createMany({
            data: obligaciones.map((o) => ({
              ...o,
              afiliacionesId: afili.id,
            })),
          });
        }
      }

      // 3) Gestiones (si vienen)
      if (gestiones) {
        const gest = await tx.gestiones.create({
          data: {
            correlativos: Array.isArray(gestiones?.correlativos) ? gestiones.correlativos : [],
          },
        });

        updateEmpresaData.gestionesId = gest.id;

        // 3.1) Folios de libro
        if (folios.length) {
          await tx.folioLibro.createMany({
            data: folios.map((f) => ({
              ...f,
              gestionesId: gest.id,
            })),
          });
        }
      }

      // 4) Actualizar empresa con los IDs creados
      if (Object.keys(updateEmpresaData).length) {
        await tx.empresa.update({
          where: { id: empresa.id },
          data: updateEmpresaData,
        });
      }

      // 5) Cuentas bancarias
      if (cuentas.length) {
        await tx.cuentaBancaria.createMany({
          data: cuentas.map((c) => ({
            empresaId: empresa.id,
            numero: c.numero,
            banco: c.banco,
            descripcion: c.descripcion,
            moneda: c.moneda,
            saldoInicial: c.saldoInicial,
            cuentaContableId: c.cuentaContableId,
          })),
        });
      }

      return empresa;
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    console.error("POST empresas error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
