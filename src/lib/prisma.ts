// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * En Vercel (serverless) conviene usar un singleton para evitar
 * crear demasiadas conexiones durante hot-reloads o invocaciones.
 *
 * Además, si tienes PRISMA_ACCELERATE_URL configurado, usaremos
 * esa URL (pooling administrado por Prisma Accelerate).
 */

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

function makeClient() {
  const inDev = process.env.NODE_ENV === "development";

  // Si usas Prisma Accelerate, puedes inyectar la URL pooleada aquí.
  // Si no la usas, Prisma tomará DATABASE_URL del schema.prisma
  const datasourceUrl = process.env.PRISMA_ACCELERATE_URL || undefined;

  return new PrismaClient({
    // Usa 'pretty' para mensajes más claros cuando haya errores de Prisma
    errorFormat: "pretty",
    log: inDev ? ["query", "warn", "error"] : ["error"],

    // Si usas Accelerate (opcional):
    // @ts-expect-error - 'datasourceUrl' es soportado por Prisma a partir de v5
    datasourceUrl,
  });
}

export const prisma = globalThis.prismaGlobal ?? makeClient();

// En desarrollo, conserva una única instancia en el global
if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;

export default prisma;
