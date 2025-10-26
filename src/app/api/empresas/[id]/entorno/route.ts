//src/app/api/empresas/[id]/entorno/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Normalizador super-tolerante para SI/NO
const norm = (v: any) =>
  (v ?? "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

const yes = (v: any) => {
  const s = norm(v);
  if (!s) return false;
  if (s === "1" || s === "true" || s === "si" || s === "s") return true;
  if (s.startsWith("si")) return true; // "sí", "si.", "si,"
  return false;
};

type FlagKey =
  | "presentaFacturas"
  | "retencionIva"
  | "retencionIsr"
  | "presentanIso"
  | "presentaInventarios"
  | "libroCompras"
  | "libroVentas"
  | "libroDiario"
  | "libroDiarioDetalle"
  | "libroMayor"
  | "balanceGeneralEstadoResult"
  | "estadosFinancieros"
  | "conciliacionBancaria"
  | "asientoContable";

const FIELDS: FlagKey[] = [
  "presentaFacturas",
  "retencionIva",
  "retencionIsr",
  "presentanIso",
  "presentaInventarios",
  "libroCompras",
  "libroVentas",
  "libroDiario",
  "libroDiarioDetalle",
  "libroMayor",
  "balanceGeneralEstadoResult",
  "estadosFinancieros",
  "conciliacionBancaria",
  "asientoContable",
];

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const empresaId = Number(ctx.params.id);
  if (!empresaId || Number.isNaN(empresaId)) {
    return NextResponse.json({ ok: false, error: "BAD_ID" }, { status: 400 });
  }

  try {
    // ✅ Traer EMPRESA por id + include afiliaciones + filas de régimen
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        afiliaciones: {
          include: {
            regimenIva: true, // RegimenIvaFila
            regimenIsr: true, // RegimenIsrFila
          },
        },
      },
    });

    if (!empresa) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    }

    const afili = empresa.afiliaciones || null;
    const iva = afili?.regimenIva || null;
    const isr = afili?.regimenIsr || null;

    // OR entre los dos regímenes para cada flag
    const flag = (k: FlagKey) => {
      const a = iva ? yes((iva as any)[k]) : false;
      const b = isr ? yes((isr as any)[k]) : false;
      return a || b;
    };

    // Documentos
    const documentos: { label: string; href: string }[] = [];
    if (flag("presentaFacturas")) documentos.push({ label: "Facturas", href: "documentos" });
    if (flag("retencionIva"))     documentos.push({ label: "Retenciones IVA", href: "documentos/retenciones/iva" });
    if (flag("retencionIsr"))     documentos.push({ label: "Retenciones ISR", href: "documentos/retenciones/isr" });

    // Reportes: activo si hay al menos una retención
    const enableReportes = flag("retencionIva") || flag("retencionIsr");

    const nombreIva = norm(iva?.nombreComun);
    const nombreIsr = norm(isr?.nombreComun);
    const nombres = `${nombreIva} | ${nombreIsr}`;

    const reportes = enableReportes
      ? {
          href: "reportes",
          caps: {
            ivaTrimestral: /primario|pecuario/.test(nombres),
            isrTrimestralBaseEstimada: /isr trimestral \(renta imponible estimada\)/.test(nombres),
            isrTrimestralCierresParciales: /isr trimestral \(cierre parciales\)/.test(nombres),
            isoTrimestral:
              /isr trimestral \(renta imponible estimada\)|isr trimestral \(cierre parciales\)/.test(nombres),
          },
        }
      : null;

    // Inventarios
    const inventarios = flag("presentaInventarios") ? { href: "inventarios" } : null;

    // Libros (un botón que abre selector interno)
    const librosEnabled =
      flag("libroCompras") ||
      flag("libroVentas") ||
      flag("libroDiario") ||
      flag("libroDiarioDetalle") ||
      flag("libroMayor") ||
      flag("balanceGeneralEstadoResult");
    const libros = librosEnabled ? { href: "libros" } : null;

    // Estados / Conciliación / Asientos
    const estados = flag("estadosFinancieros") ? { href: "libros/estados" } : null;
    const conciliacion = flag("conciliacionBancaria") ? { href: "libros/conciliacion" } : null;
    const asientos = flag("asientoContable") ? { href: "asientos_contables", crear: "asientos_contables/crear" } : null;

    // Exportar flags crudos para el Sidebar
    const flags: Record<string, boolean> = {};
    for (const k of FIELDS) flags[k] = flag(k);

    return NextResponse.json({
      ok: true,
      data: {
        empresaId: empresa.id,
        empresaNombre: empresa.nombre,
        nomenclaturaId: afili?.nomenclaturaId ?? null,
        features: { documentos, reportes, inventarios, libros, estados, conciliacion, asientos },
        raw: {
          iva: iva?.id ?? null,
          isr: isr?.id ?? null,
          nombreIva: iva?.nombreComun ?? "",
          nombreIsr: isr?.nombreComun ?? "",
          flags,
        },
      },
    });
  } catch (err) {
    console.error("ENTORNO error:", err);
    // Fallback seguro (sin 500)
    return NextResponse.json({
      ok: true,
      data: {
        empresaId,
        empresaNombre: "",
        nomenclaturaId: null,
        features: {
          documentos: [],
          reportes: null,
          inventarios: null,
          libros: null,
          estados: null,
          conciliacion: null,
          asientos: null,
        },
        raw: { error: "SAFE_FALLBACK" },
      },
    });
  }
}
