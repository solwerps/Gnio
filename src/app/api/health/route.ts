// src/app/api/health/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const ping = await prisma.$queryRaw`SELECT 1 as ok`;
    return NextResponse.json({
      ok: true,
      db: "connected",
      env: {
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasJwtSecret: Boolean(process.env.APP_JWT_SECRET),
      },
      ping
    });
  } catch (err: any) {
    console.error("[/api/health] ERROR:", err);
    return NextResponse.json({
      ok: false,
      error: err?.message || String(err),
      code: err?.code,
      name: err?.name,
    }, { status: 500 });
  }
}
