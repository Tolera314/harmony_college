import type { EmailProvider } from './email';

/**
 * SendGrid email provider (alternative).
 * Configure via:
 *   SENDGRID_API_KEY   — API key
 *   SENDGRID_FROM_EMAIL — verified sender address
 */
export class SendGridEmailProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly from:   string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY    ?? '';
    this.from   = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@harmonycollege.edu.et';
  }

  private async send(to: string, subject: string, text: string): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) return { success: false, error: 'SENDGRID_API_KEY is not configured.' };
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body:    JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: this.from }, subject, content: [{ type: 'text/plain', value: text }] }),
      });
      if (!res.ok) { const t = await res.text(); return { success: false, error: `SendGrid ${res.status}: ${t.slice(0,200)}` }; }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  async sendVerificationEmail(
    to: string,
    params: { fullName: string; verificationLink: string; expiresInMinutes: number }
  ): Promise<{ success: boolean; error?: string }> {
    return this.send(to, 'Verify your Harmony College account',
      `Hello ${params.fullName}, verify your account: ${params.verificationLink} (expires in ${params.expiresInMinutes} min)`);
  }

  async sendPasswordResetEmail(
    to: string,
    params: { fullName: string; resetLink: string; expiresInMinutes: number }
  ): Promise<{ success: boolean; error?: string }> {
    return this.send(to, 'Reset your Harmony College password',
      `Hello ${params.fullName}, reset your password: ${params.resetLink} (expires in ${params.expiresInMinutes} min). If you did not request this, ignore this email.`);
  }
}
