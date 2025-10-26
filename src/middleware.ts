// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.APP_JWT_SECRET);

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;
    const path = req.nextUrl.pathname;

    // Protección por rol
    if (path.startsWith('/dashboard/admin') && role !== 'ADMIN')
      return NextResponse.redirect(new URL('/login', req.url));

    if (path.startsWith('/dashboard/contador') && role !== 'CONTADOR')
      return NextResponse.redirect(new URL('/login', req.url));

    if (path.startsWith('/dashboard/empresa') && role !== 'EMPRESA')
      return NextResponse.redirect(new URL('/login', req.url));

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
