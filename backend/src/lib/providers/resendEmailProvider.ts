import type { EmailProvider } from './email';

/**
 * Resend.com email provider.
 * Configure via:
 *   RESEND_API_KEY    — API key from resend.com
 *   RESEND_FROM_EMAIL — verified sender address
 */
export class ResendEmailProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly from:   string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY    ?? '';
    this.from   = process.env.RESEND_FROM_EMAIL ?? 'noreply@harmonycollege.edu.et';
  }

  private async send(to: string, subject: string, html: string, text: string): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) return { success: false, error: 'RESEND_API_KEY is not configured.' };
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body:    JSON.stringify({ from: this.from, to: [to], subject, html, text }),
      });
      if (!res.ok) { const t = await res.text(); return { success: false, error: `Resend ${res.status}: ${t.slice(0,200)}` }; }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  async sendVerificationEmail(
    to: string,
    params: { fullName: string; verificationLink: string; expiresInMinutes: number }
  ): Promise<{ success: boolean; error?: string }> {
    const text = `Hello ${params.fullName},\n\nVerify your Harmony College account:\n${params.verificationLink}\n\nExpires in ${params.expiresInMinutes} minutes.`;
    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0F0F10;color:#fff;padding:40px 20px;max-width:600px;margin:0 auto;">
      <h1 style="color:#E9C349;">Harmony College</h1>
      <p>Hello <strong>${params.fullName}</strong>,</p>
      <p>Click below to verify your email.</p>
      <a href="${params.verificationLink}" style="display:inline-block;background:#E9C349;color:#0F0F10;font-weight:bold;padding:14px 28px;border-radius:10px;text-decoration:none;margin:20px 0;">Verify Email</a>
      <p style="color:#888;font-size:13px;">Expires in ${params.expiresInMinutes} minutes. If this wasn't you, ignore this email.</p>
    </body></html>`;
    return this.send(to, 'Verify your Harmony College account', html, text);
  }

  async sendPasswordResetEmail(
    to: string,
    params: { fullName: string; resetLink: string; expiresInMinutes: number }
  ): Promise<{ success: boolean; error?: string }> {
    const text = `Hello ${params.fullName},\n\nReset your Harmony College password:\n${params.resetLink}\n\nExpires in ${params.expiresInMinutes} minutes. If you did not request this, ignore this email.`;
    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0F0F10;color:#fff;padding:40px 20px;max-width:600px;margin:0 auto;">
      <h1 style="color:#E9C349;">Harmony College</h1>
      <p>Hello <strong>${params.fullName}</strong>,</p>
      <p>Click below to reset your password. This link expires in ${params.expiresInMinutes} minutes.</p>
      <a href="${params.resetLink}" style="display:inline-block;background:#E9C349;color:#0F0F10;font-weight:bold;padding:14px 28px;border-radius:10px;text-decoration:none;margin:20px 0;">Reset Password</a>
      <p style="color:#888;font-size:13px;">If you did not request a password reset, you can safely ignore this email.</p>
    </body></html>`;
    return this.send(to, 'Reset your Harmony College password', html, text);
  }
}
