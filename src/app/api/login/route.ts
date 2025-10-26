// src/app/api/login/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const secret = new TextEncoder().encode(process.env.APP_JWT_SECRET);

type AllowedRole = 'ADMIN' | 'CONTADOR' | 'EMPRESA';

function roleToPath(role: AllowedRole) {
  switch (role) {
    case 'CONTADOR': return 'contador';
    case 'EMPRESA':  return 'empresa';
    case 'ADMIN':
    default:         return 'admin';
  }
}

/**
 * Crea/asegura un tenant con slug = user.username.
 * Si la tabla Tenant no existe aún (no hiciste migrate), NO rompe el login (solo salta).
 */
async function ensureTenantForUser(user: {
  id: number; role: AllowedRole; username: string; name?: string | null; companyName?: string | null;
}) {
  try {
    const existing = await prisma.tenant.findUnique({ where: { slug: user.username } });
    if (existing) return existing;

    const type = user.role === 'EMPRESA' ? 'COMPANY' : 'PERSONAL';
    const displayName = user.role === 'EMPRESA'
      ? (user.companyName ?? user.username)
      : (user.name ?? user.username);

    return await prisma.tenant.create({
      data: {
        type,
        slug: user.username,
        displayName,
        createdById: user.id,
        memberships: {
          create: { userId: user.id, role: 'OWNER' },
        },
      },
    });
  } catch (e: any) {
    // P2021 = table/view not found (depende de versión). Si no existe Tenant aún, ignoramos temporalmente.
    const code = e?.code || e?.name || '';
    if (code === 'P2021' || /table .*tenant.* does not exist/i.test(String(e?.message))) {
      console.warn('[ensureTenantForUser] Tabla Tenant no existe todavía. Aplica la migración.');
      return null;
    }
    throw e;
  }
}

export async function POST(req: Request) {
  const { username, password } = await req.json();

  // 1) Buscar usuario
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 });
  }

  // 2) Validar contraseña
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  // 3) Asegurar tenant (si ya migraste, lo creará/encontrará; si no, no rompe)
  await ensureTenantForUser({
    id: user.id,
    role: user.role as AllowedRole,
    username: user.username,
    name: user.name,
    companyName: user.companyName,
  });

  // 4) Token (ajusta claims/exp según tu política)
  const token = await new SignJWT({ userId: user.id, role: user.role, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);

  // 5) Redirect target
  const rolePath = roleToPath(user.role as AllowedRole);
  const redirect = rolePath === 'admin'
    ? '/dashboard/admin'
    : `/dashboard/${rolePath}/${user.username}`;

  // 6) Respuesta + cookie
  const res = NextResponse.json({
    message: 'Login exitoso',
    role: user.role,
    redirect, // <- úsalo en el cliente
    user: { id: user.id, username: user.username },
  });

  res.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
  });

  return res;
}
