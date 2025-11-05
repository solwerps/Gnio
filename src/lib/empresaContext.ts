//src/lib/empresaContext.ts

'use server';
import { cookies } from 'next/headers';

/** Resuelve empresaId desde query ?empresa= o cookie activeEmpresaId */
export function getActiveEmpresaId(searchParams?: URLSearchParams): number {
  const q = searchParams?.get('empresa');
  if (q) return Number(q);
  const c = cookies().get('activeEmpresaId')?.value;
  if (c) return Number(c);
  throw new Error('No se encontró empresa activa (parámetro [id] o cookie).');
}
