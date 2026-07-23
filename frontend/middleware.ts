import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/src/lib/auth';

export const runtime = 'nodejs';

/**
 * Routes that require an authenticated session.
 * Add dashboard, admin, profile routes here as they are built.
 */
const PROTECTED_ROUTES = ['/admin', '/profile', '/dashboard'];

/**
 * Routes only accessible when NOT authenticated.
 * Authenticated users are redirected away from these.
 */
const AUTH_ONLY_ROUTES = ['/signin', '/apply'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get('session')?.value ?? null;
  const session = token ? await verifyJWT(token) : null;

  const isAuthenticated = session !== null;

  // Redirect authenticated users away from sign-in / apply
  if (isAuthenticated && AUTH_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Redirect unauthenticated users away from protected routes
  if (!isAuthenticated && PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const loginUrl = new URL('/signin', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except static assets and API
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|uploads/).*)'],
};
