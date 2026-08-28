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
    this.apiKey = process.env.RESEND_API_KEY ?? '';
    let rawFrom = process.env.RESEND_FROM_EMAIL ?? process.env.EMAIL_FROM ?? 'onboarding@resend.dev';
    if (/@(gmail|yahoo|hotmail|outlook|icloud)\.com/i.test(rawFrom)) {
      rawFrom = 'onboarding@resend.dev';
    }
    this.from = rawFrom;
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

  async sendHrNotificationEmail(
    to: string,
    params: { recipientName: string; subject: string; heading: string; body: string }
  ): Promise<{ success: boolean; error?: string }> {
    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <img src="https://harmony.edu/logo.png" alt="Harmony College" style="height:40px;margin-bottom:24px" />
      <h2 style="color:#0F0F10">${params.heading}</h2>
      <p>Dear ${params.recipientName},</p>
      <p style="white-space:pre-line">${params.body}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
      <p style="color:#888;font-size:12px">Harmony College HR System — automated notification</p>
    </body></html>`;
    const text = `${params.heading}\n\nDear ${params.recipientName},\n\n${params.body}`;
    return this.send(to, params.subject, html, text);
  }

  async sendStaffInvitationEmail(
    to: string,
    params: { fullName: string; role: string; departmentName: string; invitationLink: string; expiresInHours: number }
  ): Promise<{ success: boolean; error?: string }> {
    const text = `You're Invited to Harmony College\n\nHello ${params.fullName},\n\nYou have been invited to join Harmony College as ${params.role} in the ${params.departmentName} department.\n\nAccept your invitation and set up your account here:\n${params.invitationLink}\n\nThis link is secure and will expire in ${params.expiresInHours} hours.\nIf you did not expect this invitation, please contact administrator support immediately.`;
    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0F0F10;color:#fff;padding:40px 20px;max-width:600px;margin:0 auto;">
      <h1 style="color:#E9C349;margin-bottom:24px;">Harmony College</h1>
      <h2 style="color:#fff;font-size:20px;">You're Invited to Join Harmony College</h2>
      <p>Hello <strong>${params.fullName}</strong>,</p>
      <p>You have been invited to join Harmony College as a staff member:</p>
      <div style="background:#1A1A1E;border-left:4px solid #E9C349;padding:16px;margin:20px 0;border-radius:6px;">
        <p style="margin:4px 0;"><strong>Role:</strong> ${params.role}</p>
        <p style="margin:4px 0;"><strong>Department:</strong> ${params.departmentName}</p>
      </div>
      <p>Click the secure link below to set your password and activate your account:</p>
      <a href="${params.invitationLink}" style="display:inline-block;background:#E9C349;color:#0F0F10;font-weight:bold;padding:14px 28px;border-radius:10px;text-decoration:none;margin:20px 0;">Accept Invitation</a>
      <p style="color:#888;font-size:13px;margin-top:24px;">This link expires in ${params.expiresInHours} hours. If you did not expect this invitation, please disregard this email or contact support.</p>
    </body></html>`;
    return this.send(to, "You're Invited to Harmony College", html, text);
  }
}
