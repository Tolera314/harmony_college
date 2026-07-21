import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../lib/auth';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Reads the HttpOnly "session" cookie, verifies the JWT,
 * and attaches the decoded payload to req.user.
 * Returns 401 if the token is missing or invalid.
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token: string | undefined = req.cookies?.session;

  if (!token) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid.' });
    return;
  }

  req.user = {
    userId: payload.userId as string,
    email: payload.email as string,
    role: payload.role as string,
  };

  next();
}
