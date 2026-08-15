/**
 * Harmony College — OAuth / OpenID Connect Service
 * ──────────────────────────────────────────────────
 * Provides PKCE authorization-code flow implementation for:
 * - Google OAuth 2.0 / OpenID Connect
 * - Facebook Login (OAuth 2.0)
 *
 * Security Requirements:
 * 1. Strict PKCE (S256) and CSRF state validation.
 * 2. Unlinked OAuth matching existing email REQUIRES explicit password verification (NO auto-linking).
 * 3. Provider tokens and client secrets are NEVER exposed to frontend or logs.
 * 4. New OAuth accounts default to STUDENT role and profileCompleted = false.
 */

import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { OAuthProvider, Role, AccountStatus } from '@prisma/client';
import { SignJWT, jwtVerify } from 'jose';

// ── Environment Helpers ──────────────────────────────────────────────────────

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/api/auth/oauth/google/callback';
  return { clientId, clientSecret, redirectUri };
}

function getFacebookConfig() {
  const appId       = process.env.FACEBOOK_APP_ID       ?? '';
  const appSecret   = process.env.FACEBOOK_APP_SECRET   ?? '';
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI ?? 'http://localhost:3000/api/auth/oauth/facebook/callback';
  return { appId, appSecret, redirectUri };
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? 'harmony_college_development_jwt_secret_key_32chars_min';
  return new TextEncoder().encode(secret);
}

// ── PKCE & State Helpers ─────────────────────────────────────────────────────

export function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

// ── Authorization URL Builders ────────────────────────────────────────────────

export function buildGoogleAuthUrl(state: string, codeChallenge: string): string {
  const { clientId, redirectUri } = getGoogleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function buildFacebookAuthUrl(state: string, codeChallenge: string): string {
  const { appId, redirectUri } = getFacebookConfig();
  const params = new URLSearchParams({
    client_id:             appId,
    redirect_uri:          redirectUri,
    response_type:         'code',
    scope:                 'email,public_profile',
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

// ── Provider Token Exchange & UserInfo ───────────────────────────────────────

export interface OAuthProfile {
  providerAccountId: string;
  email: string | null;
  fullName: string;
  emailVerified: boolean;
}

export async function exchangeGoogleCode(
  code: string,
  codeVerifier: string
): Promise<OAuthProfile> {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error('[OAuth Google] Token exchange failed:', tokenRes.status, errText);
    throw new Error('Failed to exchange authorization code with Google.');
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };

  // Fetch UserInfo using Access Token
  const userinfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userinfoRes.ok) {
    throw new Error('Failed to fetch user profile from Google.');
  }

  const userinfo = (await userinfoRes.json()) as {
    sub: string;
    email?: string;
    name?: string;
    email_verified?: boolean;
  };

  return {
    providerAccountId: userinfo.sub,
    email: userinfo.email?.toLowerCase() ?? null,
    fullName: userinfo.name ?? (userinfo.email ? userinfo.email.split('@')[0] : 'Google Student'),
    emailVerified: userinfo.email_verified ?? true,
  };
}

export async function exchangeFacebookCode(
  code: string,
  codeVerifier: string
): Promise<OAuthProfile> {
  const { appId, appSecret, redirectUri } = getFacebookConfig();

  // Exchange code for access token (Facebook supports PKCE via code_verifier)
  const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id',     appId);
  tokenUrl.searchParams.set('client_secret', appSecret);
  tokenUrl.searchParams.set('code',          code);
  tokenUrl.searchParams.set('code_verifier', codeVerifier);
  tokenUrl.searchParams.set('redirect_uri',  redirectUri);

  const tokenRes = await fetch(tokenUrl.toString());

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error('[OAuth Facebook] Token exchange failed:', tokenRes.status, errText);
    throw new Error('Failed to exchange authorization code with Facebook.');
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };

  // Fetch user profile from Graph API
  const profileUrl = new URL('https://graph.facebook.com/me');
  profileUrl.searchParams.set('fields',       'id,name,email');
  profileUrl.searchParams.set('access_token', tokenData.access_token);

  const profileRes = await fetch(profileUrl.toString());

  if (!profileRes.ok) {
    throw new Error('Failed to fetch user profile from Facebook.');
  }

  const fbUser = (await profileRes.json()) as {
    id:     string;
    name?:  string;
    email?: string;
  };

  return {
    providerAccountId: fbUser.id,
    email:             fbUser.email?.toLowerCase() ?? null,
    fullName:          fbUser.name ?? (fbUser.email ? fbUser.email.split('@')[0] : 'Facebook Student'),
    // Facebook only returns email if the user granted the email permission;
    // when present it is always associated with the verified Facebook account.
    emailVerified:     !!fbUser.email,
  };
}

// ── Account Linking & User Lookup Logic ──────────────────────────────────────

export type ProcessOAuthResult =
  | { type: 'AUTHENTICATED'; user: any }
  | { type: 'LINK_REQUIRED'; pendingLinkToken: string; email: string }
  | { type: 'ACCOUNT_BLOCKED'; error: string; code: string };

export async function processOAuthUser(
  provider: OAuthProvider,
  profile: OAuthProfile
): Promise<ProcessOAuthResult> {
  // Step 1: Look up by existing OAuthAccount link
  const existingLink = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: { user: true },
  });

  if (existingLink) {
    const user = existingLink.user;

    // Check account status
    if (user.status === AccountStatus.DEACTIVATED) {
      return { type: 'ACCOUNT_BLOCKED', error: 'This account has been deactivated. Please contact support.', code: 'ACCOUNT_DEACTIVATED' };
    }
    if (user.status === AccountStatus.SUSPENDED) {
      return { type: 'ACCOUNT_BLOCKED', error: 'This account has been suspended. Please contact support.', code: 'ACCOUNT_SUSPENDED' };
    }
    if (user.status === AccountStatus.LOCKED) {
      return { type: 'ACCOUNT_BLOCKED', error: 'This account is locked due to security policy. Please contact support.', code: 'ACCOUNT_LOCKED' };
    }

    return { type: 'AUTHENTICATED', user };
  }

  // Step 2: Look up by Email match if present
  // Per security policy: do NOT auto-link. Require the user to verify their
  // existing Harmony College password before the OAuth identity is linked.
  if (profile.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingUser) {
      // Check status of existing account
      if (existingUser.status === AccountStatus.DEACTIVATED) {
        return { type: 'ACCOUNT_BLOCKED', error: 'This account has been deactivated. Please contact support.', code: 'ACCOUNT_DEACTIVATED' };
      }
      if (existingUser.status === AccountStatus.SUSPENDED) {
        return { type: 'ACCOUNT_BLOCKED', error: 'This account has been suspended. Please contact support.', code: 'ACCOUNT_SUSPENDED' };
      }
      if (existingUser.status === AccountStatus.LOCKED) {
        return { type: 'ACCOUNT_BLOCKED', error: 'This account is locked due to security policy. Please contact support.', code: 'ACCOUNT_LOCKED' };
      }

      // Issue a short-lived pending-link token that the /link-account endpoint
      // will verify after the user proves ownership via their password.
      const pendingLinkToken = await signPendingLinkToken({
        userId:            existingUser.id,
        provider,
        providerAccountId: profile.providerAccountId,
        email:             profile.email,
      });

      return { type: 'LINK_REQUIRED', pendingLinkToken, email: profile.email };
    }
  }

  // Step 3: No existing user found -> Create new STUDENT account
  const newUser = await prisma.user.create({
    data: {
      fullName: profile.fullName,
      email: profile.email,
      passwordHash: null, // Passwordless OAuth user
      role: Role.STUDENT, // Hardcoded server-side protection
      status: AccountStatus.ACTIVE,
      emailVerified: profile.emailVerified,
      phoneVerified: false,
      profileCompleted: false,
      profileCompletion: 0,
      oauthAccounts: {
        create: {
          provider,
          providerAccountId: profile.providerAccountId,
        },
      },
    },
  });

  return { type: 'AUTHENTICATED', user: newUser };
}

// ── Pending Link Token Signer/Verifier ───────────────────────────────────────

export interface PendingLinkPayload {
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
}

export async function signPendingLinkToken(payload: PendingLinkPayload): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m') // Short 10-minute expiry
    .sign(secret);
}

export async function verifyPendingLinkToken(token: string): Promise<PendingLinkPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return {
      userId: payload.userId as string,
      provider: payload.provider as OAuthProvider,
      providerAccountId: payload.providerAccountId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}
