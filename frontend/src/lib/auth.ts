import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-at-least-32-chars-long';
const key = new TextEncoder().encode(JWT_SECRET);

/**
 * Verifies the session JWT cookie (used by Next.js middleware for route protection).
 * JWT is signed by the backend — we only need to verify here, never sign.
 */
export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    return null;
  }
}
