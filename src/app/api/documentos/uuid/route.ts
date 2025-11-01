// ==================================================================
// API: /api/documentos/uuid?value=<uuid>
// Archivo: src/app/api/documentos/uuid/route.ts
// ==================================================================
import { NextRequest } from "next/server";
import { executeQuery } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uuid = searchParams.get("value");
    if (!uuid) return Response.json({ status: 400, data: {}, message: "uuid requerido" });

    const query = `
      SELECT *
      FROM documentos
      WHERE uuid = ?
      LIMIT 1
    `;
    const [row] = await executeQuery({ query, values: [uuid] }) as any[];
    if (!row) return Response.json({ status: 404, data: {}, message: "No encontrado" });

    return Response.json({ status: 200, data: row, message: "OK" });
  } catch (e) {
    return Response.json({ status: 400, data: {}, message: "Error" });
  }
}
