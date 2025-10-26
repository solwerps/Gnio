// src/app/api/login/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { SignJWT } from "jose";

type AllowedRole = "ADMIN" | "CONTADOR" | "EMPRESA";

function roleToPath(role: AllowedRole) {
  switch (role) {
    case "CONTADOR": return "contador";
    case "EMPRESA":  return "empresa";
    case "ADMIN":
    default:         return "admin";
  }
}

async function ensureTenantForUser(user: {
  id: number; role: AllowedRole; username: string; name?: string | null; companyName?: string | null;
}) {
  try {
    const existing = await prisma.tenant.findUnique({ where: { slug: user.username } });
    if (existing) return existing;

    const type = user.role === "EMPRESA" ? "COMPANY" : "PERSONAL";
    const displayName = user.role === "EMPRESA"
      ? (user.companyName ?? user.username)
      : (user.name ?? user.username);

    return await prisma.tenant.create({
      data: {
        type, slug: user.username, displayName, createdById: user.id,
        memberships: { create: { userId: user.id, role: "OWNER" } },
      },
    });
  } catch (e: any) {
    const code = e?.code || e?.name || "";
    if (code === "P2021" || /tenant.*does not exist/i.test(String(e?.message))) {
      console.warn("[ensureTenantForUser] Tenant table missing (ignored).");
      return null;
    }
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    // 0) ENV requerido para JWT
    const secretValue = process.env.APP_JWT_SECRET;
    if (!secretValue) {
      console.error("[/api/login] MISSING APP_JWT_SECRET");
      return NextResponse.json({ ok: false, error: "MISSING_APP_JWT_SECRET" }, { status: 500 });
    }
    const secret = new TextEncoder().encode(secretValue);

    // 1) Body seguro
    const body = await req.json().catch(() => ({}));
    const { username, email, identifier, password } = body as {
      username?: string; email?: string; identifier?: string; password?: string;
    };
    if (!password || (!username && !email && !identifier)) {
      return NextResponse.json(
        { ok: false, error: "EMAIL_OR_USERNAME_AND_PASSWORD_REQUIRED" },
        { status: 400 }
      );
    }
    const key = (identifier ?? username ?? email)!.toString().trim();

    // 2) Buscar por username o email
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: key }, { email: key }] },
    });
    if (!user) return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 401 });
    if (!user.passwordHash) {
      console.error("[/api/login] USER_HAS_NO_PASSWORD:", user.id);
      return NextResponse.json({ ok: false, error: "USER_HAS_NO_PASSWORD" }, { status: 500 });
    }

    // 3) Validar contraseña
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ ok: false, error: "INVALID_CREDENTIALS" }, { status: 401 });

    // 4) Asegurar tenant (no rompe si tabla falta)
    await ensureTenantForUser({
      id: user.id,
      role: user.role as AllowedRole,
      username: user.username,
      name: user.name,
      companyName: user.companyName,
    });

    // 5) Token + redirect
    const token = await new SignJWT({ userId: user.id, role: user.role, username: user.username })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    const rolePath = roleToPath(user.role as AllowedRole);
    const redirect = rolePath === "admin" ? "/dashboard/admin" : `/dashboard/${rolePath}/${user.username}`;

    // 6) Respuesta JSON + cookie
    const res = NextResponse.json({
      ok: true,
      message: "LOGIN_OK",
      role: user.role,
      redirect,
      user: { id: user.id, username: user.username, email: user.email },
    });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60,
    });
    return res;
  } catch (err: any) {
    // 🔍 TEMP: devuelve detalles del error para ver el motivo real en prod
    console.error("[/api/login] ERROR:", err);
    return NextResponse.json({
      ok: false,
      error: "INTERNAL_ERROR",
      details: { message: err?.message, code: err?.code, name: err?.name }
    }, { status: 500 });
  }
}
