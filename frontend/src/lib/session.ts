import { cookies } from 'next/headers';
import { verifyJWT } from './auth';

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Returns the decoded session payload from the HttpOnly cookie,
 * or null if the session is missing / invalid / expired.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload) return null;

  return {
    userId: payload.userId as string,
    email: payload.email as string,
    role: payload.role as string,
  };
}
