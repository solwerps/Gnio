// src/app/api/register/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Roles permitidos (deben coincidir con tu enum Role en Prisma)
const ALLOWED_ROLES = new Set(['ADMIN', 'CONTADOR', 'EMPRESA'] as const);
type AllowedRole = 'ADMIN' | 'CONTADOR' | 'EMPRESA';

// Mapear rol -> segmento de URL
function roleToPath(role: AllowedRole) {
  switch (role) {
    case 'CONTADOR':
      return 'contador';
    case 'EMPRESA':
      return 'empresa';
    case 'ADMIN':
    default:
      return 'admin';
  }
}

// Validar que el username sea un slug seguro para URL
function isSlugSafe(input: string) {
  // letras/numeros y guiones, sin espacios, ni guiones al inicio/fin
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(input);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, email, password, role } = body as {
      username?: string;
      email?: string;
      password?: string;
      role?: AllowedRole;
    };

    // ---- Validaciones básicas
    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Faltan campos: username, email, password, role' },
        { status: 400 }
      );
    }
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }
    if (!isSlugSafe(username)) {
      return NextResponse.json(
        { error: 'El username debe ser un slug válido (solo letras/números y guiones, sin espacios)' },
        { status: 400 }
      );
    }

    // ---- Unicidad de usuario
    const exists = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json(
        { error: 'Usuario o email ya existe' },
        { status: 400 }
      );
    }

    // ---- Unicidad del entorno (tenant) por slug
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: username },
      select: { id: true },
    });
    if (existingTenant) {
      return NextResponse.json(
        { error: 'Ya existe un entorno con ese username. Elige otro.' },
        { status: 400 }
      );
    }

    // ---- Crear todo en transacción
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1) Crear usuario
      const user = await tx.user.create({
        data: { username, email, passwordHash, role },
      });

      // 2) Crear tenant (aislado) + membership (OWNER)
      const tenantType = role === 'EMPRESA' ? 'COMPANY' : 'PERSONAL' as const;
      const displayName =
        user.role === 'EMPRESA'
          ? (user.companyName ?? user.username)
          : (user.name ?? user.username);

      const tenant = await tx.tenant.create({
        data: {
          type: tenantType,
          slug: user.username,       // clave de URL
          displayName,
          createdById: user.id,
          memberships: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
      });

      // 3) (Opcional) Sembrar datos por tenant (clonar seeds globales)
      // await seedTenantDefaults(tenant.id);

      return { user, tenant };
    });

    const rolePath = roleToPath(result.user.role);
    const redirect = `/dashboard/${rolePath}/${result.user.username}`;

    return NextResponse.json({
      message: 'Usuario registrado con éxito',
      user: {
        id: result.user.id,
        username: result.user.username,
        role: result.user.role,
      },
      tenant: {
        id: result.tenant.id,
        slug: result.tenant.slug,
      },
      redirect, // <-- usa esto en el cliente: router.push(redirect)
    });
  } catch (err: any) {
    console.error('REGISTER_ERROR', err);
    // Errores típicos de unicidad Prisma
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Usuario o email ya existe' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al registrar usuario' },
      { status: 500 }
    );
  }
}
