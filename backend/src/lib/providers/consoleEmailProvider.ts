import type { EmailProvider } from './email';

/**
 * Development-only email provider.
 * Logs the verification link to stdout. NEVER use in production.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async sendVerificationEmail(
    to: string,
    params: { fullName: string; verificationLink: string; expiresInMinutes: number }
  ): Promise<{ success: boolean; error?: string }> {
    if (process.env.NODE_ENV === 'production') {
      console.error('[ConsoleEmailProvider] Must not be used in production.');
      return { success: false, error: 'Console provider not allowed in production.' };
    }
    console.log(`\n📧 [DEV EMAIL] ─────────────────────────────────`);
    console.log(`   To:      ${to}`);
    console.log(`   Name:    ${params.fullName}`);
    console.log(`   Link:    ${params.verificationLink}`);
    console.log(`   Expires: ${params.expiresInMinutes} minutes`);
    console.log(`────────────────────────────────────────────────\n`);
    return { success: true };
  }

  async sendPasswordResetEmail(
    to: string,
    params: { fullName: string; resetLink: string; expiresInMinutes: number }
  ): Promise<{ success: boolean; error?: string }> {
    if (process.env.NODE_ENV === 'production') {
      console.error('[ConsoleEmailProvider] Must not be used in production.');
      return { success: false, error: 'Console provider not allowed in production.' };
    }
    console.log(`\n🔑 [DEV PASSWORD RESET EMAIL] ───────────────────`);
    console.log(`   To:      ${to}`);
    console.log(`   Name:    ${params.fullName}`);
    console.log(`   Link:    ${params.resetLink}`);
    console.log(`   Expires: ${params.expiresInMinutes} minutes`);
    console.log(`────────────────────────────────────────────────\n`);
    return { success: true };
  }
}
