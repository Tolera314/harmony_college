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
    if (!this.apiKey) return { success: false, error: 'RESEND_API_KEY environment variable is not configured in backend/.env.' };
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body:    JSON.stringify({ from: this.from, to: [to], subject, html, text }),
      });
      if (!res.ok) {
        const raw = await res.text();
        let message = raw;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.message) message = parsed.message;
        } catch { /* raw text fallback */ }
        console.error(`[ResendEmailProvider] HTTP ${res.status} error for recipient "${to}":`, message);
        return { success: false, error: `Resend error (${res.status}): ${message}` };
      }
      return { success: true };
    } catch (err: any) {
      const cause = err?.cause ? ` (${err.cause.code || err.cause.message || String(err.cause)})` : '';
      const detail = `${err?.message || 'Network request failed'}${cause}`;
      console.error(`[ResendEmailProvider] Network error connecting to https://api.resend.com:`, err);
      return {
        success: false,
        error: `Could not reach Resend mail server (${detail}). Please verify internet connectivity, DNS, or firewall settings.`,
      };
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
    const text = `Welcome to Harmony College\n\nDear ${params.fullName},\n\nYour Harmony College institutional account has been successfully created for your position as ${params.position} (${params.role}) in the ${params.departmentName} department.\n\nTo activate your account and establish your secure password, please visit the following link:\n${params.activationLink}\n\nThis activation link is cryptographically secured and will expire in ${params.expiresInHours} hours. For security reasons, no temporary password is provided in this message.\n\nWelcome to our academic community,\nHarmony College HR Office`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activate Your Harmony College Account</title>
</head>
<body style="margin: 0; padding: 40px 16px; background-color: #0B0B0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E4E4E7;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto;">
    <!-- Logo & Header -->
    <tr>
      <td style="text-align: center; padding-bottom: 28px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td style="vertical-align: middle; padding-right: 12px;">
              <img src="https://harmonycollege.edu.et/logo2.jpg" alt="Harmony College" width="48" height="48" style="display: block; border-radius: 50%; border: 2px solid #E9C349;" />
            </td>
            <td style="vertical-align: middle; text-align: left;">
              <span style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #FFFFFF; letter-spacing: 0.5px; display: block;">Harmony College</span>
              <span style="font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #E9C349; font-weight: 700; display: block; margin-top: 2px;">Office of Human Resources</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Card -->
    <tr>
      <td style="background-color: #141416; border: 1px solid #27272A; border-radius: 16px; padding: 36px 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
        <h1 style="font-family: Georgia, serif; font-size: 24px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px 0; text-align: center;">
          Account Activation Notice
        </h1>
        <p style="font-size: 15px; line-height: 1.6; color: #A1A1AA; margin: 0 0 24px 0;">
          Dear <strong style="color: #FFFFFF;">${params.fullName}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #D4D4D8; margin: 0 0 24px 0;">
          An official Harmony College system account has been created for your role. Please activate your account and establish your secure login credentials to access the faculty and staff portal.
        </p>

        <!-- Role & Position Info Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1B1B1F; border: 1px solid #2E2E35; border-left: 4px solid #E9C349; border-radius: 10px; margin: 0 0 28px 0;">
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 4px 0; font-size: 11px; text-transform: uppercase; font-family: monospace; color: #71717A; width: 110px;">Position</td>
                  <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #FFFFFF;">${params.position}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 11px; text-transform: uppercase; font-family: monospace; color: #71717A;">System Role</td>
                  <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #E9C349;">${params.role}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 11px; text-transform: uppercase; font-family: monospace; color: #71717A;">Department</td>
                  <td style="padding: 4px 0; font-size: 13px; font-weight: 500; color: #E4E4E7;">${params.departmentName}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Action Button -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0 24px 0;">
          <tr>
            <td align="center">
              <a href="${params.activationLink}" target="_blank" style="display: inline-block; background-color: #E9C349; color: #0F0F10; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 12px; letter-spacing: 0.2px; text-align: center; box-shadow: 0 4px 14px rgba(233,195,73,0.3);">
                Activate Account / Set Password
              </a>
            </td>
          </tr>
        </table>

        <!-- Direct Link Backup -->
        <p style="font-size: 12px; line-height: 1.5; color: #71717A; margin: 0 0 16px 0; text-align: center;">
          Or copy and paste this secure link into your browser:
        </p>
        <p style="font-size: 11px; line-height: 1.4; color: #A1A1AA; word-break: break-all; background-color: #0E0E10; border: 1px solid #27272A; border-radius: 8px; padding: 10px 12px; margin: 0 0 24px 0; font-family: monospace;">
          ${params.activationLink}
        </p>

        <!-- Security Note -->
        <div style="border-top: 1px solid #27272A; padding-top: 20px;">
          <p style="font-size: 12px; line-height: 1.6; color: #71717A; margin: 0;">
            <strong style="color: #A1A1AA;">Security Notice:</strong> This activation link will expire in ${params.expiresInHours} hours. Harmony College will never send a permanent password via email. If you did not anticipate this account creation, please notify the IT Administration immediately.
          </p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="text-align: center; padding-top: 28px;">
        <p style="font-size: 12px; color: #52525B; margin: 0 0 6px 0;">
          &copy; ${new Date().getFullYear()} Harmony College. All rights reserved.
        </p>
        <p style="font-size: 11px; color: #3F3F46; margin: 0;">
          Official Institutional Communication &bull; Addis Ababa, Ethiopia
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return this.send(to, 'Activate Your Harmony College Account', html, text);
  }
}
