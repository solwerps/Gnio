import { NextResponse } from "next/server";
import { PLANTILLA } from "@/data/nomenclaturaPlantilla";

export async function GET() {
  return NextResponse.json({ ok: true, cuentas: PLANTILLA });
}
