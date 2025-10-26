// src/app/api/_utils/nomenclaturaTenant.ts
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * Resuelve sesión + tenant sin requerir siempre ?tenant=...
 * Orden de resolución del slug:
 *   1) Query param "tenant"
 *   2) Header "x-tenant-slug" | "x-tenant"
 *   3) Fallback: session.user.username
 *
 * Mantiene tu lógica de autocreación y autorizaciones por rol.
 */
export async function requireSessionAndTenant(req: Request) {
  const session = await getSession();
  if (!session) return { error: "UNAUTHORIZED", status: 401 } as const;

  // 1) Query param
  const url = new URL(req.url);
  let tenantSlug = url.searchParams.get("tenant")?.trim();

  // 2) Header (opcional)
  if (!tenantSlug) {
    const hdr =
      req.headers.get("x-tenant-slug") ||
      req.headers.get("x-tenant") ||
      undefined;
    tenantSlug = hdr?.trim() || undefined;
  }

  // 3) Fallback al username de la sesión
  if (!tenantSlug && session.user?.username) {
    tenantSlug = String(session.user.username).trim();
  }

  if (!tenantSlug) {
    return { error: "TENANT_REQUIRED", status: 400 } as const;
  }

  // Localiza tenant por slug
  let tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, slug: true, type: true, createdById: true },
  });

  // --- AUTOCREACIÓN (si no existe) ---
  if (!tenant) {
    // Solo autocreamos cuando el slug coincide con el username del usuario actual
    if (session.user.username === tenantSlug) {
      const isContador = session.user.role === "CONTADOR";
      const isEmpresa = session.user.role === "EMPRESA";

      const type = isContador ? "PERSONAL" : isEmpresa ? "COMPANY" : null;

      if (type) {
        tenant = await prisma.tenant.create({
          data: {
            slug: tenantSlug,
            displayName: tenantSlug,
            type,
            createdById: session.user.id,
            memberships: {
              create: {
                userId: session.user.id,
                role: "OWNER",
              },
            },
          },
          select: { id: true, slug: true, type: true, createdById: true },
        });
      }
    }
  }

  if (!tenant) return { error: "TENANT_NOT_FOUND", status: 404 } as const;

  // --- Autorización por rol/tenant ---
  if (session.user.role === "CONTADOR") {
    // Debe ser su entorno PERSONAL y el slug debe coincidir con su username
    if (!(tenant.type === "PERSONAL" && session.user.username === tenant.slug)) {
      return { error: "FORBIDDEN", status: 403 } as const;
    }
  } else if (session.user.role === "EMPRESA") {
    // Debe ser entorno COMPANY y:
    //  - o el slug coincide con su username (dueño)
    //  - o tiene membership en ese tenant
    if (tenant.type !== "COMPANY") {
      return { error: "FORBIDDEN", status: 403 } as const;
    }
    if (session.user.username !== tenant.slug) {
      const membership = await prisma.membership.findUnique({
        where: {
          userId_tenantId: { userId: session.user.id, tenantId: tenant.id },
        },
        select: { userId: true },
      });
      if (!membership) {
        return { error: "FORBIDDEN", status: 403 } as const;
      }
    }
  } else {
    // Otros roles (ADMIN, etc.) — ajusta a tu política si lo necesitas
    return { error: "FORBIDDEN", status: 403 } as const;
  }

  return { session, tenant } as const;
}
