// src/lib/tenant.ts
import { prisma } from "@/lib/prisma";

/**
 * Busca un tenant por slug y verifica que el userId tenga membresía.
 * Devuelve el tenant si existe y el usuario es miembro. Si no, retorna null.
 */
export async function getTenantBySlugForUser(slug: string, userId: number) {
  if (!slug || !userId) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { memberships: { where: { userId } } },
  });

  if (!tenant || tenant.memberships.length === 0) {
    return null; // sin acceso
  }
  return tenant;
}
