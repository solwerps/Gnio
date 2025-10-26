// /src/app/api/empresas/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const revalidate = 0;

// Helper: dd/mm/aaaa -> Date | null
function parseDMY(d?: string | null): Date | null {
  if (!d) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d.trim());
  if (!m) return null;
  const dd = Number(m[1]), mm = Number(m[2]) - 1, yyyy = Number(m[3]);
  const dt = new Date(yyyy, mm, dd);
  if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm || dt.getDate() !== dd) return null;
  return dt;
}

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const empresaId = Number(ctx.params.id);
    if (!empresaId || Number.isNaN(empresaId)) {
      return NextResponse.json({ ok: false, error: "BAD_ID" }, { status: 400 });
    }

    const e = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        afiliaciones: {
          include: {
            obligaciones: true,
          },
        },
        gestiones: {
          include: {
            folios: true,
          },
        },
        cuentasBancarias: {
          include: { cuentaContable: true },
        },
      },
    });

    if (!e) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    // Armar respuesta en el "shape" que usa tu UI
    const data = {
      id: e.id,
      tenant: e.tenant,
      nombre: e.nombre,
      nit: e.nit,
      sectorEconomico: e.sectorEconomico,
      razonSocial: e.razonSocial, // "Individual" | "Juridico"
      avatarUrl: e.avatarUrl,

      // Los JSON se devuelven tal cual; tu InfoTab ya los sabe consumir
      infoIndividual: e.infoIndividual ?? undefined,
      infoJuridico: e.infoJuridico ?? undefined,

      // Bloque Afiliaciones
      afiliaciones: e.afiliaciones
        ? {
            regimenIvaId: e.afiliaciones.regimenIvaId ?? undefined,
            regimenIsrId: e.afiliaciones.regimenIsrId ?? undefined,
            nomenclaturaId: e.afiliaciones.nomenclaturaId ?? undefined,
            obligaciones: (e.afiliaciones.obligaciones || []).map((o) => ({
              id: String(o.id),
              impuesto: o.impuesto || "Otro",
              codigoFormulario: o.codigoFormulario || "",
              // se devuelve en ISO; tu UI lo puede convertir a dmy si lo necesitas
              fechaPresentacion: o.fechaPresentacion
                ? o.fechaPresentacion.toISOString().slice(0, 10)
                : "",
              nombreObligacion: o.nombreObligacion || "",
            })),
          }
        : { regimenIvaId: undefined, regimenIsrId: undefined, nomenclaturaId: undefined, obligaciones: [] },

      // Bloque Gestiones
      gestiones: e.gestiones
        ? {
            folios: (e.gestiones.folios || []).map((f) => ({
              id: f.id,
              libro: f.libro,
              disponibles: Number(f.disponibles ?? 0),
              usados: Number(f.usados ?? 0),
              ultimaFecha: f.ultimaFecha ? f.ultimaFecha.toISOString().slice(0, 10) : null,
            })),
            correlativos: e.gestiones.correlativos ?? [],
          }
        : { folios: [], correlativos: [] },

      // Cuentas bancarias
      cuentasBancarias: (e.cuentasBancarias || []).map((c) => ({
        id: c.id,
        numero: c.numero,
        banco: c.banco,
        descripcion: c.descripcion ?? "",
        moneda: c.moneda,
        saldoInicial: Number(c.saldoInicial),
        cuentaContableId: c.cuentaContableId ?? undefined,
      })),

      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("GET empresa error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  try {
    const empresaId = Number(ctx.params.id);
    if (!empresaId || Number.isNaN(empresaId)) {
      return NextResponse.json({ ok: false, error: "BAD_ID" }, { status: 400 });
    }

    const body = await req.json();

    // Desempaquetar el payload tal como lo arma tu UI
    const {
      tenant,
      nombre,
      nit,
      sectorEconomico,
      razonSocial,
      avatarUrl,
      info, // {tipo:"Individual"| "Juridico", ...campos}
      afiliaciones, // {regimenIvaId, regimenIsrId, nomenclaturaId, obligaciones[]}
      gestiones, // {folios[], correlativos[]}
      cuentasBancarias, // []
    } = body || {};

    // Validaciones mínimas
    if (!nombre || !nit || !sectorEconomico || !razonSocial) {
      return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    }

    // Traer existente
    const exists = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        afiliaciones: { include: { obligaciones: true } },
        gestiones: { include: { folios: true } },
        cuentasBancarias: true,
      },
    });
    if (!exists) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

    // Armar parches base
    const patchEmpresa: any = {
      tenant: tenant ?? exists.tenant,
      nombre,
      nit,
      sectorEconomico,
      razonSocial,
      avatarUrl: avatarUrl ?? exists.avatarUrl,
    };

    // Mapear info -> infoIndividual / infoJuridico
    if (info?.tipo === "Individual") {
      patchEmpresa.infoIndividual = info;
      patchEmpresa.infoJuridico = null;
    } else if (info?.tipo === "Juridico") {
      patchEmpresa.infoJuridico = info;
      patchEmpresa.infoIndividual = null;
    }

    // Transacción para mantener coherencia
    const updated = await prisma.$transaction(async (tx) => {
      // 1) Empresa
      const upEmpresa = await tx.empresa.update({
        where: { id: empresaId },
        data: patchEmpresa,
      });

      // 2) Afiliaciones (crear si no existe; actualizar si sí)
      let afiliId = exists.afiliacionesId;
      if (!afiliId) {
        if (afiliaciones) {
          const createdA = await tx.afiliaciones.create({
            data: {
              empresa: { connect: { id: empresaId } },
              regimenIvaId: afiliaciones.regimenIvaId || null,
              regimenIsrId: afiliaciones.regimenIsrId || null,
              nomenclaturaId: afiliaciones.nomenclaturaId || null,
            },
          });
          afiliId = createdA.id;
        }
      } else {
        if (afiliaciones) {
          await tx.afiliaciones.update({
            where: { id: afiliId },
            data: {
              regimenIvaId: afiliaciones.regimenIvaId || null,
              regimenIsrId: afiliaciones.regimenIsrId || null,
              nomenclaturaId: afiliaciones.nomenclaturaId || null,
            },
          });
        }
      }

      // 2.1) Obligaciones: simplificamos → borramos y recreamos
      if (afiliId) {
        await tx.obligacion.deleteMany({ where: { afiliacionesId: afiliId } });

        const toCreate = (afiliaciones?.obligaciones || []).map((o: any) => ({
          afiliacionesId: afiliId!,
          impuesto: String(o.impuesto || "Otro"),
          codigoFormulario: o.codigoFormulario || null,
          fechaPresentacion:
            typeof o.fechaPresentacion === "string"
              ? parseDMY(o.fechaPresentacion) || null
              : o.fechaPresentacion
              ? new Date(o.fechaPresentacion)
              : null,
          nombreObligacion: o.nombreObligacion || null,
        }));
        if (toCreate.length) {
          await tx.obligacion.createMany({ data: toCreate });
        }
      }

      // 3) Gestiones/Folios: igual, borramos y recreamos
      if (!exists.gestionesId) {
        if (gestiones) {
          const g = await tx.gestiones.create({
            data: {
              empresa: { connect: { id: empresaId } },
              correlativos: gestiones.correlativos ?? [],
            },
          });
          // crear folios
          const folios = (gestiones.folios || []).map((f: any) => ({
            gestionesId: g.id,
            libro: String(f.libro),
            disponibles: Number(f.disponibles || 0),
            usados: Number(f.usados || 0),
            ultimaFecha:
              typeof f.ultimaFecha === "string"
                ? parseDMY(f.ultimaFecha) || (f.ultimaFecha ? new Date(f.ultimaFecha) : null)
                : f.ultimaFecha
                ? new Date(f.ultimaFecha)
                : null,
          }));
          if (folios.length) await tx.folioLibro.createMany({ data: folios });
        }
      } else {
        // update correlativos + folios
        await tx.folioLibro.deleteMany({ where: { gestionesId: exists.gestionesId } });
        if (gestiones) {
          await tx.gestiones.update({
            where: { id: exists.gestionesId },
            data: { correlativos: gestiones.correlativos ?? [] },
          });
          const folios = (gestiones.folios || []).map((f: any) => ({
            gestionesId: exists.gestionesId!,
            libro: String(f.libro),
            disponibles: Number(f.disponibles || 0),
            usados: Number(f.usados || 0),
            ultimaFecha:
              typeof f.ultimaFecha === "string"
                ? parseDMY(f.ultimaFecha) || (f.ultimaFecha ? new Date(f.ultimaFecha) : null)
                : f.ultimaFecha
                ? new Date(f.ultimaFecha)
                : null,
          }));
          if (folios.length) await tx.folioLibro.createMany({ data: folios });
        }
      }

      // 4) Cuentas bancarias: borrar y recrear
      await tx.cuentaBancaria.deleteMany({ where: { empresaId } });
      const cuentas = (cuentasBancarias || []).map((c: any) => ({
        empresaId,
        numero: String(c.numero || ""),
        banco: String(c.banco || ""),
        descripcion: c.descripcion || null,
        moneda: c.moneda || "GTQ",
        saldoInicial: Number(c.saldoInicial || 0),
        cuentaContableId: c.cuentaContableId || null,
      }));
      if (cuentas.length) await tx.cuentaBancaria.createMany({ data: cuentas });

      return upEmpresa;
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (err) {
    console.error("PUT empresa error:", err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
