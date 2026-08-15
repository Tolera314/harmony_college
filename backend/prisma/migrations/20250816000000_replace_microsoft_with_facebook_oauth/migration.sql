-- Replace MICROSOFT with FACEBOOK in the OAuthProvider enum.
-- Any existing OAuthAccount rows with provider='MICROSOFT' should be
-- cleaned up manually before running this in production.

ALTER TYPE "OAuthProvider" RENAME VALUE 'MICROSOFT' TO 'FACEBOOK';
