// src/app/api/nomenclaturas/guardar/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Crea una nueva nomenclatura con todas sus cuentas.
// IMPORTANTE: persistimos isPlantilla y todos los lock*
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, descripcion, versionGNIO, cuentas = [] } = body ?? {};

    if (!nombre || !Array.isArray(cuentas)) {
      return NextResponse.json({ ok: false, error: "BAD_PAYLOAD" }, { status: 400 });
    }

    // Normalizamos el payload para Prisma (enums como string están OK)
    const cuentasData = (cuentas as any[]).map((c, i) => ({
      orden: Number(c.orden ?? i + 1),
      cuenta: String(c.cuenta ?? ""),
      descripcion: String(c.descripcion ?? ""),
      debeHaber: c.debeHaber,                 // "DEBE" | "HABER"
      principalDetalle: c.principalDetalle,   // "P" | "D"
      nivel: Number(c.nivel ?? 0),
      tipo: c.tipo,                           // "BALANCE_GENERAL" | ...
      naturaleza: c.naturaleza,               // "ACTIVO" | ... | "REVISAR"

      // 🔒 Locks y marca de plantilla PERSISTIDOS
      lockCuenta: !!c.lockCuenta,
      lockDescripcion: !!c.lockDescripcion,
      lockDebeHaber: !!c.lockDebeHaber,
      lockPrincipalDetalle: !!c.lockPrincipalDetalle,
      lockNivel: !!c.lockNivel,
      lockTipo: !!c.lockTipo,
      lockNaturaleza: !!c.lockNaturaleza,
      lockRowActions: !!c.lockRowActions,
      isPlantilla: !!c.isPlantilla,
    }));

    const created = await prisma.nomenclatura.create({
      data: {
        nombre,
        descripcion: descripcion ?? "",
        versionGNIO: versionGNIO ?? null,
        cuentas: {
          create: cuentasData,
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id, totalFilas: cuentasData.length }, { status: 201 });
  } catch (e) {
    console.error("POST /api/nomenclaturas/guardar", e);
    return NextResponse.json({ ok: false, error: "CREATE_FAILED" }, { status: 500 });
  }
}
