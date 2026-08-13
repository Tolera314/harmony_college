import { cookies } from 'next/headers';
import { verifyJWT } from './auth';

export interface SessionPayload {
  userId:           string;
  sessionId:        string;
  email:            string | null;
  role:             string;
  status:           string;
  profileCompleted: boolean;
}

/**
 * Server-side helper: returns the decoded session payload from the HttpOnly
 * cookie, or null if missing / invalid / expired.
 * Reads the new accessToken cookie first; falls back to the legacy session
 * cookie for backward compatibility.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();

  const token =
    cookieStore.get('accessToken')?.value ??
    cookieStore.get('session')?.value;

  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload) return null;

  return {
    userId:           payload.userId           as string,
    sessionId:        (payload.sessionId       as string | undefined) ?? '',
    email:            (payload.email           as string | null | undefined) ?? null,
    role:             payload.role             as string,
    status:           (payload.status          as string | undefined) ?? 'ACTIVE',
    profileCompleted: (payload.profileCompleted as boolean | undefined) ?? false,
  };
}
