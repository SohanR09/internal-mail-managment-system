import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
const secret = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null;

const publicRoutes = ['/login', '/signup'];
const publicApiRoutes = ['/api/auth/login', '/api/auth/signup'];
const staticAssets = [
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/_next',
  '/public',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (staticAssets.some((asset) => pathname.startsWith(asset))) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('session')?.value;
  let isValidSession = false;

  if (sessionCookie && secret) {
    try {
      await jwtVerify(sessionCookie, secret);
      isValidSession = true;
    } catch {
      isValidSession = false;
    }
  }

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    if (isValidSession) {
      // Redirect authenticated users away from login/signup
      return NextResponse.redirect(new URL('/mail/inbox', request.url));
    }
    return NextResponse.next();
  }

  // Allow public API routes
  if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow /api/auth/* routes
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Require auth for protected page routes
  if (!pathname.startsWith('/api')) {
    if (!isValidSession) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Require auth for protected API routes
  if (pathname.startsWith('/api')) {
    if (!isValidSession) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
