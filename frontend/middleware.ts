import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/src/lib/auth';

export const runtime = 'nodejs';

/**
 * Routes that require an authenticated session.
 * Unauthenticated visitors are redirected to /signin?from=<pathname>.
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/welcome',
  '/onboarding',
  '/admin',
  '/profile',
];

/**
 * Routes only accessible when NOT authenticated.
 * Authenticated users are redirected to their role dashboard.
 */
const AUTH_ONLY_ROUTES = ['/signin', '/apply'];

/**
 * Routes that are always public — skip all redirect logic.
 * /verify-email must be reachable by unauthenticated users who click
 * an email verification link.
 */
const ALWAYS_PUBLIC = ['/verify-email', '/forgot-password', '/reset-password'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always-public routes — never redirect
  if (ALWAYS_PUBLIC.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Accept new accessToken cookie; fall back to legacy session cookie
  const token =
    req.cookies.get('accessToken')?.value ??
    req.cookies.get('session')?.value ??
    null;

  const session = token ? await verifyJWT(token) : null;
  const isAuthenticated = session !== null;

  // ── Redirect authenticated users away from auth-only routes ──────────────
  if (isAuthenticated && AUTH_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    const role             = session.role             as string  | undefined;
    const profileCompleted = session.profileCompleted as boolean | undefined;

    if (role === 'STUDENT' && profileCompleted === false) {
      return NextResponse.redirect(new URL('/welcome', req.url));
    }

    const dashMap: Record<string, string> = {
      STUDENT:         '/dashboard/student',
      INSTRUCTOR:      '/dashboard/instructor',
      DEPARTMENT_HEAD: '/dashboard/department-head',
      HR_OFFICER:      '/dashboard/hr',
      FINANCE_OFFICER: '/dashboard/finance-officer',
      REGISTRAR:       '/dashboard/registrar',
      ADMIN:           '/dashboard/admin',
      SUPER_ADMIN:     '/dashboard/admin',
    };
    return NextResponse.redirect(new URL(dashMap[role ?? ''] ?? '/dashboard/student', req.url));
  }

  // ── Redirect unauthenticated users away from protected routes ─────────────
  if (!isAuthenticated && PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const loginUrl = new URL('/signin', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Student profile-completion gate ──────────────────────────────────────
  if (
    isAuthenticated &&
    pathname.startsWith('/dashboard/student') &&
    (session.role as string) === 'STUDENT' &&
    (session.profileCompleted as boolean | undefined) === false
  ) {
    return NextResponse.redirect(new URL('/welcome', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|uploads/).*)'],
};
