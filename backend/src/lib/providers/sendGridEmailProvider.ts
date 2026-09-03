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

  async sendHrNotificationEmail(
    to: string,
    params: { recipientName: string; subject: string; heading: string; body: string }
  ): Promise<{ success: boolean; error?: string }> {
    return this.send(
      to,
      params.subject,
      `Dear ${params.recipientName},\n\n${params.body}\n\n— Harmony College HR System`,
    );
  }

  async sendStaffInvitationEmail(
    to: string,
    params: { fullName: string; role: string; departmentName: string; invitationLink: string; expiresInHours: number }
  ): Promise<{ success: boolean; error?: string }> {
    return this.send(
      to,
      "You're Invited to Harmony College",
      `Hello ${params.fullName},\n\nYou have been invited to join Harmony College as ${params.role} (${params.departmentName}).\nAccept your invitation: ${params.invitationLink} (expires in ${params.expiresInHours} hours).\nIf unexpected, contact administrator support.`,
    );
  }

  async sendAccountActivationEmail(
    to: string,
    params: {
      fullName:       string;
      role:           string;
      position:       string;
      departmentName: string;
      activationLink: string;
      expiresInHours: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    return this.send(
      to,
      'Activate Your Harmony College Account',
      `Welcome to Harmony College\n\nDear ${params.fullName},\n\nYour Harmony College institutional account has been created for your position as ${params.position} (${params.role}) in the ${params.departmentName} department.\n\nTo activate your account and establish your password, visit:\n${params.activationLink}\n\nThis link is secure and expires in ${params.expiresInHours} hours.\n\nHarmony College HR Office`,
    );
  }
}
