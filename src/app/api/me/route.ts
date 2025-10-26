// src/app/api/me/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";

const ALLOWED_ROLES = new Set(["ADMIN", "CONTADOR", "EMPRESA"] as const);
type AllowedRole = "ADMIN" | "CONTADOR" | "EMPRESA";

function toDateOrNull(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      name: true,
      phone: true,
      companyName: true,
      nit: true,
      dpi: true,
      appointmentDate: true,
      prestationType: true,
      status: true,
      country: true,
      address: true,
      photoUrl: true,
      photoPublicId: true,
      createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();

  // Campos editables
  const {
    username,
    email,
    role,
    name,
    phone,
    companyName,
    country,
    address,
    nit,
    dpi,
    appointmentDate,
    prestationType,
    status,
    photoUrl,
    photoPublicId,

    password,
    passwordConfirm,
  } = body ?? {};

  // Validaciones básicas
  if (password && password !== passwordConfirm) {
    return NextResponse.json({ error: "PASSWORD_MISMATCH" }, { status: 400 });
  }
  if (role && !ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "INVALID_ROLE" }, { status: 400 });
  }

  try {
    const userCurrent = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, username: true, role: true },
    });
    if (!userCurrent) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const isUsernameChange = username && username !== userCurrent.username;
    const isRoleChange = role && role !== userCurrent.role;

    const result = await prisma.$transaction(async (tx) => {
      // 1) Si cambia username, validar unicidad y mover slug de Tenant
      if (isUsernameChange) {
        const existsUser = await tx.user.findUnique({ where: { username } });
        if (existsUser) throw new Error("USERNAME_TAKEN");

        const existsTenant = await tx.tenant.findUnique({ where: { slug: username } });
        if (existsTenant) throw new Error("TENANT_SLUG_TAKEN");
      }

      // 2) Preparar update User
      const dataUser: any = {
        username: username ?? undefined,
        email: email ?? undefined,
        role: role ?? undefined,
        name: name ?? undefined,
        phone: phone ?? undefined,
        companyName: companyName ?? undefined,
        country: country ?? undefined,
        address: address ?? undefined,
        nit: nit ?? undefined,
        dpi: dpi ?? undefined,
        appointmentDate: appointmentDate ? toDateOrNull(appointmentDate) : undefined,
        prestationType: prestationType ?? undefined,
        status: status ?? undefined,
        photoUrl: photoUrl ?? undefined,
        photoPublicId: photoPublicId ?? undefined,
      };

      if (password && String(password).trim().length > 0) {
        dataUser.passwordHash = await bcrypt.hash(password, 10);
      }

      const updated = await tx.user.update({
        where: { id: session.user.id },
        data: dataUser,
      });

      // 3) Sincronizar Tenant si hay cambios de username o role
      if (isUsernameChange || isRoleChange) {
        // Asumimos 1 tenant por usuario con slug = username
        const tenant = await tx.tenant.findUnique({
          where: { slug: userCurrent.username },
        });

        if (tenant) {
          await tx.tenant.update({
            where: { id: tenant.id },
            data: {
              slug: isUsernameChange ? username : undefined,
              type: isRoleChange
                ? (role === "EMPRESA" ? "COMPANY" : "PERSONAL")
                : undefined,
              displayName:
                isRoleChange && role === "EMPRESA"
                  ? (companyName ?? username ?? userCurrent.username)
                  : (name ?? username ?? userCurrent.username),
            },
          });
        }
      }

      return updated;
    });

    // Para que el cliente sepa a dónde navegar si cambió username/rol
    const newUsername = result.username;
    const newRole = (result.role as AllowedRole) ?? userCurrent.role;
    const rolePath =
      newRole === "CONTADOR" ? "contador" : newRole === "EMPRESA" ? "empresa" : "admin";
    const redirect =
      rolePath === "admin"
        ? `/dashboard/admin`
        : `/dashboard/${rolePath}/${newUsername}/perfil`;

    return NextResponse.json({ ok: true, user: result, redirect });
  } catch (e: any) {
    if (e?.message === "USERNAME_TAKEN") {
      return NextResponse.json({ error: "El username ya está en uso" }, { status: 400 });
    }
    if (e?.message === "TENANT_SLUG_TAKEN") {
      return NextResponse.json({ error: "El slug del entorno ya está en uso" }, { status: 400 });
    }
    console.error("PUT /api/me error:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
