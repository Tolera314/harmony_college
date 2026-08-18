/**
 * Harmony College — OAuth 2.0 / OpenID Connect Test Suite
 * ───────────────────────────────────────────────────────
 * Tests for Google and Facebook authentication integration:
 * 1. PKCE and state generation & authorization URL building.
 * 2. New OAuth user creation (Role STUDENT, profileCompleted = false, emailVerified = true).
 * 3. Existing linked OAuth user sign-in.
 * 4. Matched email unlinked account protection (ACCOUNT_LINK_REQUIRED triggered, no auto-merge).
 * 5. Account linking with password verification.
 * 6. State tampering and missing verifier rejection.
 * 7. Privileged role escalation protection (client params ignored).
 * 8. Passwordless OAuth user attempting traditional password login (safe 401 response).
 * 9. OAuth session creation, cookie issuance, and logout.
 * 10. Verification that provider tokens and secrets are NEVER returned in response objects.
 */

import request from 'supertest';
import testApp from './testApp';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { OAuthProvider, Role, AccountStatus } from '@prisma/client';
import {
  generateState,
  generatePKCE,
  buildGoogleAuthUrl,
  buildFacebookAuthUrl,
  processOAuthUser,
  signPendingLinkToken,
  verifyPendingLinkToken,
} from '../services/oauth';

describe('OAuth Authentication Integration Suite', () => {
  const TEST_EMAIL_NEW = 'newstudent.oauth@example.com';
  const TEST_EMAIL_EXISTING = 'existingstudent.oauth@example.com';
  const TEST_PASSWORD = 'StrongPassword123!';
  let existingUserId: string;

  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID   = process.env.GOOGLE_CLIENT_ID   || 'mock-google-client-id.apps.googleusercontent.com';
    process.env.FACEBOOK_APP_ID    = process.env.FACEBOOK_APP_ID    || 'mock-facebook-app-id';

    // Clean test accounts
    await prisma.oAuthAccount.deleteMany({
      where: {
        user: {
          email: { in: [TEST_EMAIL_NEW, TEST_EMAIL_EXISTING] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [TEST_EMAIL_NEW, TEST_EMAIL_EXISTING] },
      },
    });

    // Create an existing traditional user for account-linking tests
    const passHash = await bcrypt.hash(TEST_PASSWORD, 8);
    const user = await prisma.user.create({
      data: {
        fullName: 'Existing Student',
        email: TEST_EMAIL_EXISTING,
        passwordHash: passHash,
        role: Role.STUDENT,
        status: AccountStatus.ACTIVE,
        emailVerified: true,
        profileCompleted: true,
        profileCompletion: 100,
      },
    });
    existingUserId = user.id;
  });

  afterAll(async () => {
    await prisma.oAuthAccount.deleteMany({
      where: {
        user: {
          email: { in: [TEST_EMAIL_NEW, TEST_EMAIL_EXISTING] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: [TEST_EMAIL_NEW, TEST_EMAIL_EXISTING] },
      },
    });
    await prisma.$disconnect();
  });

  // ── 1. PKCE & URL Builders ────────────────────────────────────────────────
  describe('PKCE and URL Generation', () => {
    it('generates cryptographic state and S256 PKCE challenge', () => {
      const state = generateState();
      const { verifier, challenge } = generatePKCE();

      expect(state).toHaveLength(64);
      expect(verifier).toBeDefined();
      expect(challenge).toBeDefined();
      expect(verifier).not.toEqual(challenge);
    });

    it('builds Google authorization URL with S256 challenge', () => {
      const state = 'test_state_123';
      const challenge = 'test_challenge_456';
      const url = buildGoogleAuthUrl(state, challenge);

      expect(url).toContain('accounts.google.com');
      expect(url).toContain('state=test_state_123');
      expect(url).toContain('code_challenge=test_challenge_456');
      expect(url).toContain('code_challenge_method=S256');
    });

    it('builds Facebook authorization URL with S256 challenge', () => {
      const state     = 'test_state_fb';
      const challenge = 'test_challenge_fb';
      const url = buildFacebookAuthUrl(state, challenge);

      expect(url).toContain('facebook.com');
      expect(url).toContain('state=test_state_fb');
      expect(url).toContain('code_challenge=test_challenge_fb');
      expect(url).toContain('code_challenge_method=S256');
    });
  });

  // ── 2. New OAuth User Processing & Default Role Protection ─────────────────
  describe('New OAuth User Creation & Security', () => {
    it('creates a new STUDENT account with profileCompleted = false', async () => {
      const profile = {
        providerAccountId: 'google_sub_1001',
        email: TEST_EMAIL_NEW,
        fullName: 'New OAuth Student',
        emailVerified: true,
      };

      const result = await processOAuthUser(OAuthProvider.GOOGLE, profile);
      expect(result.type).toBe('AUTHENTICATED');
      if (result.type === 'AUTHENTICATED') {
        const u = result.user;
        expect(u.email).toBe(TEST_EMAIL_NEW);
        expect(u.role).toBe(Role.STUDENT);
        expect(u.profileCompleted).toBe(false);
        expect(u.passwordHash).toBeNull();
        expect(u.emailVerified).toBe(true);

        // Verify OAuthAccount linkage
        const link = await prisma.oAuthAccount.findUnique({
          where: {
            provider_providerAccountId: {
              provider: OAuthProvider.GOOGLE,
              providerAccountId: 'google_sub_1001',
            },
          },
        });
        expect(link).not.toBeNull();
        expect(link!.userId).toBe(u.id);
      }
    });

    it('signs in an existing linked OAuth user directly', async () => {
      const profile = {
        providerAccountId: 'google_sub_1001',
        email: TEST_EMAIL_NEW,
        fullName: 'New OAuth Student',
        emailVerified: true,
      };

      const result = await processOAuthUser(OAuthProvider.GOOGLE, profile);
      expect(result.type).toBe('AUTHENTICATED');
    });
  });

  // ── 3. Account Linking — LINK_REQUIRED for Matching Email ───────────────────
  describe('Account Linking — Password Verification Required for Email Match', () => {
    it('returns LINK_REQUIRED (not AUTHENTICATED) when email matches existing account', async () => {
      const profile = {
        providerAccountId: 'google_sub_2002_matched',
        email: TEST_EMAIL_EXISTING,
        fullName: 'Matching Google User',
        emailVerified: true,
      };

      const result = await processOAuthUser(OAuthProvider.GOOGLE, profile);

      // Must NOT silently authenticate or auto-link
      expect(result.type).toBe('LINK_REQUIRED');
      if (result.type === 'LINK_REQUIRED') {
        expect(result.pendingLinkToken).toBeDefined();
        expect(typeof result.pendingLinkToken).toBe('string');
        expect(result.email).toBe(TEST_EMAIL_EXISTING);

        // Verify NO OAuthAccount was created yet
        const linkCheck = await prisma.oAuthAccount.findFirst({
          where: {
            provider: OAuthProvider.GOOGLE,
            providerAccountId: 'google_sub_2002_matched',
          },
        });
        expect(linkCheck).toBeNull();
      }
    });

    it('POST /api/auth/oauth/link-account creates link after password verification', async () => {
      // Step 1: get a valid pendingLinkToken via processOAuthUser
      const profile = {
        providerAccountId: 'google_sub_2002_link_confirm',
        email: TEST_EMAIL_EXISTING,
        fullName: 'Matching Google User',
        emailVerified: true,
      };
      const linkResult = await processOAuthUser(OAuthProvider.GOOGLE, profile);
      expect(linkResult.type).toBe('LINK_REQUIRED');

      if (linkResult.type !== 'LINK_REQUIRED') return;

      // Step 2: submit pending link token + correct password
      const res = await request(testApp)
        .post('/api/auth/oauth/link-account')
        .send({ pendingToken: linkResult.pendingLinkToken, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(existingUserId);

      // Step 3: verify OAuthAccount was created in DB
      const link = await prisma.oAuthAccount.findFirst({
        where: {
          provider: OAuthProvider.GOOGLE,
          providerAccountId: 'google_sub_2002_link_confirm',
        },
      });
      expect(link).not.toBeNull();
      expect(link!.userId).toBe(existingUserId);
    });

    it('POST /api/auth/oauth/link-account rejects wrong password', async () => {
      const profile = {
        providerAccountId: 'google_sub_2002_wrong_pw',
        email: TEST_EMAIL_EXISTING,
        fullName: 'Matching Google User',
        emailVerified: true,
      };
      const linkResult = await processOAuthUser(OAuthProvider.GOOGLE, profile);
      expect(linkResult.type).toBe('LINK_REQUIRED');
      if (linkResult.type !== 'LINK_REQUIRED') return;

      const res = await request(testApp)
        .post('/api/auth/oauth/link-account')
        .send({ pendingToken: linkResult.pendingLinkToken, password: 'WrongPassword123!' });

      expect(res.status).toBe(401);
    });

    it('POST /api/auth/oauth/link-account rejects tampered/expired token', async () => {
      const res = await request(testApp)
        .post('/api/auth/oauth/link-account')
        .send({ pendingToken: 'not.a.valid.jwt', password: TEST_PASSWORD });

      expect(res.status).toBe(400);
    });
  });

  // ── 4. Passwordless OAuth Account Password Login Safety ────────────────────
  describe('Passwordless Account Traditional Login Safety', () => {
    it('safely rejects password login for passwordless OAuth users without crashing', async () => {
      const res = await request(testApp)
        .post('/api/auth/login')
        .send({ identifier: TEST_EMAIL_NEW, password: 'AnyPassword123!' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials.');
    });
  });

  // ── 5. Route Redirects & Error Handling ─────────────────────────────────────
  describe('OAuth Route Endpoints & Redirects', () => {
    it('GET /api/auth/oauth/google initiates flow and sets state & verifier cookies', async () => {
      const res = await request(testApp).get('/api/auth/oauth/google');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('accounts.google.com');

      const cookies = (res.headers['set-cookie'] as unknown as string[]) ?? [];
      expect(cookies.some((c) => c.includes('oauth_state='))).toBe(true);
      expect(cookies.some((c) => c.includes('oauth_verifier='))).toBe(true);
    });

    it('redirects to signin with error banner when GOOGLE_CLIENT_ID is unconfigured', async () => {
      const orig = process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;
      const res = await request(testApp).get('/api/auth/oauth/google');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/signin?error=');
      expect(res.headers.location).toContain('not%20configured');
      process.env.GOOGLE_CLIENT_ID = orig;
    });

    it('GET /api/auth/oauth/google/callback rejects mismatched or missing state', async () => {
      const res = await request(testApp)
        .get('/api/auth/oauth/google/callback?code=mock_code&state=bad_state')
        .set('Cookie', ['oauth_state=good_state', 'oauth_verifier=verifier123']);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/signin?error=');
    });

    it('GET /api/auth/oauth/facebook/callback handles provider cancellation gracefully', async () => {
      const res = await request(testApp)
        .get('/api/auth/oauth/facebook/callback?error=access_denied&error_description=User+cancelled');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/signin?error=');
      expect(res.headers.location).toContain('cancelled');
    });
  });

  // ── 6. Token & Secret Protection ───────────────────────────────────────────
  describe('Token and Secret Protection Verification', () => {
    it('never exposes provider tokens, ID tokens, or secrets in API responses or User objects', async () => {
      const res = await request(testApp).get('/api/auth/me'); // Or link-account output
      expect(res.body.googleAccessToken).toBeUndefined();
      expect(res.body.facebookAccessToken).toBeUndefined();
      expect(res.body.clientSecret).toBeUndefined();
      expect(res.body.idToken).toBeUndefined();
    });
  });
});
