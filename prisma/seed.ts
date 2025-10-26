// prisma/seed.ts
import { PrismaClient, Role, TenantType, TenantRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1) Usuarios
  const users = [
    { username: 'admin',    email: 'admin@gnio.local',    password: 'admin123',    role: Role.ADMIN },
    { username: 'contador', email: 'contador@gnio.local', password: 'contador123', role: Role.CONTADOR },
    { username: 'empresa',  email: 'empresa@gnio.local',  password: 'empresa123',  role: Role.EMPRESA },
  ];

  const createdUsers: Record<string, { id: number }> = {};

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: { email: u.email, passwordHash, role: u.role },
      create: { username: u.username, email: u.email, passwordHash, role: u.role },
      select: { id: true },
    });
    createdUsers[u.username] = user;
  }

  const contadorUserId = createdUsers['contador'].id;
  const empresaUserId  = createdUsers['empresa'].id;

  // 2) Tenants (slugs deben coincidir con lo que usas como ?tenant=…)
  const tenantContador = await prisma.tenant.upsert({
    where: { slug: 'contador' },
    update: {},
    create: {
      type: TenantType.PERSONAL,
      slug: 'contador',
      displayName: 'Entorno Contador',
      createdById: contadorUserId,
    },
  });

  const tenantEmpresa = await prisma.tenant.upsert({
    where: { slug: 'empresa' },
    update: {},
    create: {
      type: TenantType.COMPANY,
      slug: 'empresa',
      displayName: 'Empresa S.A.',
      createdById: empresaUserId,
    },
  });

  // 3) Memberships (OWNER en su propio tenant)
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: contadorUserId, tenantId: tenantContador.id } },
    update: {},
    create: {
      userId: contadorUserId,
      tenantId: tenantContador.id,
      role: TenantRole.OWNER,
    },
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: empresaUserId, tenantId: tenantEmpresa.id } },
    update: {},
    create: {
      userId: empresaUserId,
      tenantId: tenantEmpresa.id,
      role: TenantRole.OWNER,
    },
  });

  console.log('✅ Seed listo');
  console.table([
    { user: 'admin@gnio.local',    role: 'ADMIN',    tenant: '(no aplica)' },
    { user: 'contador@gnio.local', role: 'CONTADOR', tenant: tenantContador.slug },
    { user: 'empresa@gnio.local',  role: 'EMPRESA',  tenant: tenantEmpresa.slug },
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
