import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/src/lib/auth';

export const runtime = 'nodejs';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/welcome',
  '/onboarding',
  '/admin',
  '/profile',
];

const AUTH_ONLY_ROUTES = ['/signin', '/apply'];

const ALWAYS_PUBLIC = ['/verify-email', '/forgot-password', '/reset-password', '/link-account'];

// ── Silent token refresh ──────────────────────────────────────────────────────
// When the accessToken is missing/expired but a refreshToken cookie exists,
// call the backend refresh endpoint from the middleware before deciding whether
// to redirect. This prevents the "click sidebar → /signin" loop entirely.
async function silentRefresh(req: NextRequest): Promise<{
  newAccessToken: string | null;
  response: NextResponse | null;
}> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

  try {
    const refreshToken = req.cookies.get('refreshToken')?.value;
    if (!refreshToken) return { newAccessToken: null, response: null };

    const refreshRes = await fetch(`${backendUrl}/api/auth/refresh`, {
      method:  'POST',
      headers: {
        cookie: `refreshToken=${refreshToken}`,
      },
    });

    if (!refreshRes.ok) return { newAccessToken: null, response: null };

    // Extract new accessToken from the Set-Cookie header
    const setCookie = refreshRes.headers.get('set-cookie') ?? '';
    const match = setCookie.match(/accessToken=([^;]+)/);
    const newAccessToken = match?.[1] ?? null;

    return { newAccessToken, response: null };
  } catch {
    return { newAccessToken: null, response: null };
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always-public routes — never redirect
  if (ALWAYS_PUBLIC.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Read existing access token
  let token =
    req.cookies.get('accessToken')?.value ??
    req.cookies.get('session')?.value ??
    null;

  let session = token ? await verifyJWT(token) : null;

  // ── Silent refresh when token is missing/expired ──────────────────────────
  // Only attempt if the route actually needs auth (avoids unnecessary calls
  // on every public page load).
  const needsAuth = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthOnly = AUTH_ONLY_ROUTES.some((r) => pathname.startsWith(r));

  if (!session && (needsAuth || isAuthOnly)) {
    const { newAccessToken } = await silentRefresh(req);
    if (newAccessToken) {
      token   = newAccessToken;
      session = await verifyJWT(newAccessToken);
    }
  }

  const isAuthenticated = session !== null;

  // ── Redirect authenticated users away from auth-only routes ──────────────
  if (isAuthenticated && session && isAuthOnly) {
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
  if (!isAuthenticated && needsAuth) {
    const loginUrl = new URL('/signin', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Student profile-completion gate ──────────────────────────────────────
  if (
    isAuthenticated && session &&
    pathname.startsWith('/dashboard/student') &&
    (session.role as string) === 'STUDENT' &&
    (session.profileCompleted as boolean | undefined) === false
  ) {
    // Before bouncing to /welcome, check if the student was recently approved
    // by attempting a silent token refresh from the backend database.
    const { newAccessToken } = await silentRefresh(req);
    if (newAccessToken) {
      const refreshedSession = await verifyJWT(newAccessToken);
      if (refreshedSession && (refreshedSession.profileCompleted as boolean | undefined) === true) {
        const res = NextResponse.next();
        res.cookies.set('accessToken', newAccessToken, {
          httpOnly: true,
          secure:   process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path:     '/',
          maxAge:   3600,
        });
        return res;
      }
    }
    return NextResponse.redirect(new URL('/welcome', req.url));
  }

  // ── If we got a fresh token from silent refresh, set it on the response ───
  // This refreshes the browser's cookie so subsequent requests work too.
  const res = NextResponse.next();
  if (session && token && token !== (req.cookies.get('accessToken')?.value ?? req.cookies.get('session')?.value)) {
    res.cookies.set('accessToken', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
      maxAge:   3600, // 1 hour — matches backend ACCESS_TOKEN_EXPIRES_IN=1h
    });
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|uploads/).*)'],
};
