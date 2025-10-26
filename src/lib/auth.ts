// src/lib/auth.ts
// Utilidades de autenticación para Server Components (App Router)

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

/* ==== Tipos ==== */
export type UserRole = 'ADMIN' | 'CONTADOR' | 'EMPRESA';

export type TokenPayload = {
  userId: number | string;
  role: UserRole;
  username?: string;
};

export type Session = {
  user: {
    id: number;
    role: UserRole;
    username?: string;
  };
};

/* ==== Secret ==== */
const rawSecret = process.env.APP_JWT_SECRET;
if (!rawSecret) {
  console.warn('[auth] APP_JWT_SECRET no está definido. Define tu secret en .env');
}
const secret = new TextEncoder().encode(rawSecret ?? '');

/* ==== JWT helpers ==== */
export async function generateJWT(payload: TokenPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);
}

export async function verifyJWT(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify<TokenPayload>(token, secret);
    return payload;
  } catch {
    return null;
  }
}

/* ==== Sesión en Server Components ==== */
// ⚠️ Next.js 15: cookies() es ASÍNCRONO → hay que await-earlo.
export async function getSession(): Promise<Session | null> {
  const store = await cookies(); // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< cambio clave
  const token = store.get('token')?.value;
  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload || !payload.userId || !payload.role) return null;

  return {
    user: {
      id: Number(payload.userId),
      role: payload.role,
      username: payload.username,
    },
  };
}

export async function requireSession(roles?: UserRole[]): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error('NO_SESSION');
  if (roles && !roles.includes(session.user.role)) throw new Error('FORBIDDEN');
  return session;
}
