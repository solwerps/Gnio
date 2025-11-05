// /src/app/api/empresas/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const revalidate = 0;

// Helper: dd/mm/aaaa -> Date | null
function parseDMY(d?: string | null): Date | null {
  if (!d) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d.trim());
  if (!m) return null;
  const dd = Number(m[1]),
    mm = Number(m[2]) - 1,
    yyyy = Number(m[3]);
  const dt = new Date(yyyy, mm, dd);
  if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm || dt.getDate() !== dd)
    return null;
  return dt;
}

// GET /api/empresas/:id
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    // 👇 ESTE es el cambio
    const { id } = await ctx.params;
    const empresaId = Number(id);

    if (!empresaId || Number.isNaN(empresaId)) {
      return NextResponse.json(
        { ok: false, error: "BAD_ID" },
        { status: 400 }
      );
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

    if (!e)
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );

    const data = {
      id: e.id,
      tenant: e.tenant,
      nombre: e.nombre,
      nit: e.nit,
      sectorEconomico: e.sectorEconomico,
      razonSocial: e.razonSocial,
      avatarUrl: e.avatarUrl,
      infoIndividual: e.infoIndividual ?? undefined,
      infoJuridico: e.infoJuridico ?? undefined,

      afiliaciones: e.afiliaciones
        ? {
            regimenIvaId: e.afiliaciones.regimenIvaId ?? undefined,
            regimenIsrId: e.afiliaciones.regimenIsrId ?? undefined,
            nomenclaturaId: e.afiliaciones.nomenclaturaId ?? undefined,
            obligaciones: (e.afiliaciones.obligaciones || []).map((o) => ({
              id: String(o.id),
              impuesto: o.impuesto || "Otro",
              codigoFormulario: o.codigoFormulario || "",
              fechaPresentacion: o.fechaPresentacion
                ? o.fechaPresentacion.toISOString().slice(0, 10)
                : "",
              nombreObligacion: o.nombreObligacion || "",
            })),
          }
        : {
            regimenIvaId: undefined,
            regimenIsrId: undefined,
            nomenclaturaId: undefined,
            obligaciones: [],
          },

      gestiones: e.gestiones
        ? {
            folios: (e.gestiones.folios || []).map((f) => ({
              id: f.id,
              libro: f.libro,
              disponibles: Number(f.disponibles ?? 0),
              usados: Number(f.usados ?? 0),
              ultimaFecha: f.ultimaFecha
                ? f.ultimaFecha.toISOString().slice(0, 10)
                : null,
            })),
            correlativos: e.gestiones.correlativos ?? [],
          }
        : { folios: [], correlativos: [] },

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
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

// PUT /api/empresas/:id
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params; // 👈 mismo fix
    const empresaId = Number(id);

    if (!empresaId || Number.isNaN(empresaId)) {
      return NextResponse.json(
        { ok: false, error: "BAD_ID" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      tenant,
      nombre,
      nit,
      sectorEconomico,
      razonSocial,
      avatarUrl,
      info,
      afiliaciones,
      gestiones,
      cuentasBancarias,
    } = body || {};

    if (!nombre || !nit || !sectorEconomico || !razonSocial) {
      return NextResponse.json(
        { ok: false, error: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    const exists = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        afiliaciones: { include: { obligaciones: true } },
        gestiones: { include: { folios: true } },
        cuentasBancarias: true,
      },
    });
    if (!exists)
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );

    const patchEmpresa: any = {
      tenant: tenant ?? exists.tenant,
      nombre,
      nit,
      sectorEconomico,
      razonSocial,
      avatarUrl: avatarUrl ?? exists.avatarUrl,
    };

    if (info?.tipo === "Individual") {
      patchEmpresa.infoIndividual = info;
      patchEmpresa.infoJuridico = null;
    } else if (info?.tipo === "Juridico") {
      patchEmpresa.infoJuridico = info;
      patchEmpresa.infoIndividual = null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const upEmpresa = await tx.empresa.update({
        where: { id: empresaId },
        data: patchEmpresa,
      });

      // --- Afiliaciones
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
      } else if (afiliaciones) {
        await tx.afiliaciones.update({
          where: { id: afiliId },
          data: {
            regimenIvaId: afiliaciones.regimenIvaId || null,
            regimenIsrId: afiliaciones.regimenIsrId || null,
            nomenclaturaId: afiliaciones.nomenclaturaId || null,
          },
        });
      }

      if (afiliId) {
        await tx.obligacion.deleteMany({ where: { afiliacionesId: afiliId } });
        const toCreate = (afiliaciones?.obligaciones || []).map((o: any) => ({
          afiliacionesId: afiliId!,
          impuesto: String(o.impuesto || "Otro"),
          codigoFormulario: o.codigoFormulario || null,
          fechaPresentacion: o.fechaPresentacion
            ? parseDMY(o.fechaPresentacion) || new Date(o.fechaPresentacion)
            : null,
          nombreObligacion: o.nombreObligacion || null,
        }));
        if (toCreate.length) {
          await tx.obligacion.createMany({ data: toCreate });
        }
      }

      // --- Gestiones
      if (!exists.gestionesId) {
        if (gestiones) {
          const g = await tx.gestiones.create({
            data: {
              empresa: { connect: { id: empresaId } },
              correlativos: gestiones.correlativos ?? [],
            },
          });
          const folios = (gestiones.folios || []).map((f: any) => ({
            gestionesId: g.id,
            libro: String(f.libro),
            disponibles: Number(f.disponibles || 0),
            usados: Number(f.usados || 0),
            ultimaFecha: f.ultimaFecha
              ? parseDMY(f.ultimaFecha) || new Date(f.ultimaFecha)
              : null,
          }));
          if (folios.length) await tx.folioLibro.createMany({ data: folios });
        }
      } else {
        await tx.folioLibro.deleteMany({
          where: { gestionesId: exists.gestionesId },
        });
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
            ultimaFecha: f.ultimaFecha
              ? parseDMY(f.ultimaFecha) || new Date(f.ultimaFecha)
              : null,
          }));
          if (folios.length) await tx.folioLibro.createMany({ data: folios });
        }
      }

      // --- Cuentas bancarias
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
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
