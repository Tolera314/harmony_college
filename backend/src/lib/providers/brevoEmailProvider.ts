import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailProvider } from './email';

/**
 * Brevo (formerly Sendinblue) SMTP email provider.
 *
 * Required env vars:
 *   BREVO_SMTP_HOST      — smtp-relay.brevo.com
 *   BREVO_SMTP_PORT      — 587
 *   BREVO_SMTP_USER      — your Brevo SMTP login (from Brevo SMTP settings)
 *   BREVO_SMTP_KEY       — your Brevo SMTP password / API key
 *   BREVO_SENDER_EMAIL   — verified sender address (e.g. fayisatole@gmail.com)
 *   BREVO_SENDER_NAME    — display name (e.g. Harmony College)
 */
export class BrevoEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor() {
    const host  = process.env.BREVO_SMTP_HOST  ?? 'smtp-relay.brevo.com';
    const port  = parseInt(process.env.BREVO_SMTP_PORT ?? '587', 10);
    const user  = process.env.BREVO_SMTP_USER  ?? '';
    const pass  = process.env.BREVO_SMTP_KEY   ?? '';
    const email = process.env.BREVO_SENDER_EMAIL ?? '';
    const name  = process.env.BREVO_SENDER_NAME  ?? 'Harmony College';

    if (!user || !pass) {
      console.warn('[BrevoEmailProvider] BREVO_SMTP_USER or BREVO_SMTP_KEY not set — emails will fail.');
    }

    this.from = name ? `"${name}" <${email}>` : email;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,          // STARTTLS on port 587
      auth: { user, pass },
      tls: { rejectUnauthorized: true },
      pool: true,             // reuse connections
      maxConnections: 3,
      socketTimeout: 15_000,
      greetingTimeout: 10_000,
      connectionTimeout: 10_000,
    });
  }

  // ── Internal send helper ──────────────────────────────────────────────────

  private async send(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY) {
      return { success: false, error: 'Brevo SMTP credentials not configured (BREVO_SMTP_USER / BREVO_SMTP_KEY).' };
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html, text });
      console.log(`[BrevoEmailProvider] ✉ Sent "${subject}" → ${to}`);
      return { success: true };
    } catch (err: any) {
      const message = err?.message ?? String(err);
      console.error(`[BrevoEmailProvider] ✗ Failed to send "${subject}" → ${to}:`, message);
      return { success: false, error: `Brevo SMTP error: ${message}` };
    }
  }

  // ── EmailProvider interface ───────────────────────────────────────────────

  async sendVerificationEmail(
    to: string,
    params: { fullName: string; verificationLink: string; expiresInMinutes: number },
  ): Promise<{ success: boolean; error?: string }> {
    const subject = 'Verify your Harmony College account';
    const text = [
      `Hello ${params.fullName},`,
      '',
      'Please verify your Harmony College account by clicking the link below:',
      params.verificationLink,
      '',
      `This link expires in ${params.expiresInMinutes} minutes.`,
      'If you did not create an account, please ignore this email.',
    ].join('\n');

    const html = buildEmail({
      preheader: 'Verify your Harmony College account',
      heading: 'Email Verification',
      body: `
        <p style="font-size:15px;color:#D4D4D8;line-height:1.7;margin:0 0 20px 0;">
          Hello <strong style="color:#FFFFFF;">${params.fullName}</strong>,
        </p>
        <p style="font-size:14px;color:#A1A1AA;line-height:1.7;margin:0 0 28px 0;">
          Please verify your Harmony College account by clicking the button below.
        </p>
      `,
      ctaLabel: 'Verify Email Address',
      ctaLink: params.verificationLink,
      footerNote: `This verification link expires in <strong>${params.expiresInMinutes} minutes</strong>. If you did not create an account with Harmony College, please disregard this email.`,
    });

    return this.send(to, subject, html, text);
  }

  async sendPasswordResetEmail(
    to: string,
    params: { fullName: string; resetLink: string; expiresInMinutes: number },
  ): Promise<{ success: boolean; error?: string }> {
    const subject = 'Reset your Harmony College password';
    const text = [
      `Hello ${params.fullName},`,
      '',
      'We received a request to reset the password for your Harmony College account.',
      'Click the link below to choose a new password:',
      params.resetLink,
      '',
      `This link expires in ${params.expiresInMinutes} minutes.`,
      'If you did not request a password reset, you can safely ignore this email.',
    ].join('\n');

    const html = buildEmail({
      preheader: 'Reset your Harmony College password',
      heading: 'Password Reset Request',
      body: `
        <p style="font-size:15px;color:#D4D4D8;line-height:1.7;margin:0 0 20px 0;">
          Hello <strong style="color:#FFFFFF;">${params.fullName}</strong>,
        </p>
        <p style="font-size:14px;color:#A1A1AA;line-height:1.7;margin:0 0 28px 0;">
          We received a request to reset the password associated with this Harmony College account.
          Click the button below to set a new password.
        </p>
      `,
      ctaLabel: 'Reset Password',
      ctaLink: params.resetLink,
      footerNote: `This reset link expires in <strong>${params.expiresInMinutes} minutes</strong>. If you did not request a password reset, no action is required — your account remains secure.`,
    });

    return this.send(to, subject, html, text);
  }

  async sendHrNotificationEmail(
    to: string,
    params: { recipientName: string; subject: string; heading: string; body: string },
  ): Promise<{ success: boolean; error?: string }> {
    const text = [
      params.heading,
      '',
      `Dear ${params.recipientName},`,
      '',
      params.body,
      '',
      '—',
      'Harmony College HR System',
    ].join('\n');

    const html = buildEmail({
      preheader: params.subject,
      heading: params.heading,
      body: `
        <p style="font-size:15px;color:#D4D4D8;line-height:1.7;margin:0 0 16px 0;">
          Dear <strong style="color:#FFFFFF;">${params.recipientName}</strong>,
        </p>
        <p style="font-size:14px;color:#A1A1AA;line-height:1.7;white-space:pre-line;margin:0 0 8px 0;">${params.body}</p>
      `,
      footerNote: 'This is an automated notification from the Harmony College HR System.',
    });

    return this.send(to, params.subject, html, text);
  }

  async sendStaffInvitationEmail(
    to: string,
    params: {
      fullName:       string;
      role:           string;
      departmentName: string;
      invitationLink: string;
      expiresInHours: number;
    },
  ): Promise<{ success: boolean; error?: string }> {
    const subject = "You're Invited to Join Harmony College";
    const text = [
      `You're Invited to Harmony College`,
      '',
      `Hello ${params.fullName},`,
      '',
      `You have been invited to join Harmony College as ${params.role} in the ${params.departmentName} department.`,
      '',
      'Accept your invitation and set up your account here:',
      params.invitationLink,
      '',
      `This secure link expires in ${params.expiresInHours} hours.`,
      'If you did not expect this invitation, please contact administrator support immediately.',
    ].join('\n');

    const html = buildEmail({
      preheader: `You have been invited to join Harmony College as ${params.role}`,
      heading: "You're Invited to Join Harmony College",
      body: `
        <p style="font-size:15px;color:#D4D4D8;line-height:1.7;margin:0 0 20px 0;">
          Hello <strong style="color:#FFFFFF;">${params.fullName}</strong>,
        </p>
        <p style="font-size:14px;color:#A1A1AA;line-height:1.7;margin:0 0 24px 0;">
          You have been invited to join the Harmony College institutional platform as a staff member.
        </p>
        ${infoCard([
          { label: 'Assigned Role',  value: params.role,           gold: true },
          { label: 'Department',     value: params.departmentName, gold: false },
        ])}
        <p style="font-size:14px;color:#A1A1AA;line-height:1.7;margin:24px 0 0 0;">
          Click the secure button below to set your password and activate your account.
        </p>
      `,
      ctaLabel: 'Accept Invitation',
      ctaLink: params.invitationLink,
      footerNote: `This invitation link expires in <strong>${params.expiresInHours} hours</strong>. If you did not expect this invitation, please disregard this email or contact the system administrator.`,
    });

    return this.send(to, subject, html, text);
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
    },
  ): Promise<{ success: boolean; error?: string }> {
    const subject = 'Activate Your Harmony College Account';
    const text = [
      'Welcome to Harmony College',
      '',
      `Dear ${params.fullName},`,
      '',
      `Your Harmony College institutional account has been created for your position as ${params.position} (${params.role}) in the ${params.departmentName} department.`,
      '',
      'To activate your account and set your secure password, please visit:',
      params.activationLink,
      '',
      `This activation link expires in ${params.expiresInHours} hours.`,
      'For security reasons, no temporary password is provided in this message.',
      '',
      'Welcome to our academic community,',
      'Harmony College HR Office',
    ].join('\n');

    const html = buildEmail({
      preheader: 'Your Harmony College institutional account has been created',
      heading: 'Account Activation Notice',
      subheading: 'Office of Human Resources',
      body: `
        <p style="font-size:15px;color:#D4D4D8;line-height:1.7;margin:0 0 20px 0;">
          Dear <strong style="color:#FFFFFF;">${params.fullName}</strong>,
        </p>
        <p style="font-size:14px;color:#A1A1AA;line-height:1.7;margin:0 0 24px 0;">
          An official Harmony College system account has been created for your role. Please activate
          your account and establish your secure login credentials to access the faculty and staff portal.
        </p>
        ${infoCard([
          { label: 'Position',    value: params.position,       gold: false },
          { label: 'System Role', value: params.role,           gold: true  },
          { label: 'Department',  value: params.departmentName, gold: false },
        ])}
        <p style="font-size:14px;color:#A1A1AA;line-height:1.7;margin:24px 0 0 0;">
          Click the button below to set your password and gain access to the portal.
        </p>
      `,
      ctaLabel: 'Activate Account / Set Password',
      ctaLink: params.activationLink,
      showDirectLink: params.activationLink,
      footerNote: `This activation link expires in <strong>${params.expiresInHours} hours</strong>. Harmony College will never send a permanent password via email. If you did not anticipate this account creation, please notify IT Administration immediately.`,
    });

    return this.send(to, subject, html, text);
  }
}

// ── HTML template helpers ─────────────────────────────────────────────────────

interface InfoRow {
  label: string;
  value: string;
  gold?: boolean;
}

function infoCard(rows: InfoRow[]): string {
  const rowsHtml = rows.map(r => `
    <tr>
      <td style="padding:5px 0;font-size:11px;text-transform:uppercase;font-family:monospace;color:#71717A;width:110px;vertical-align:top;">${r.label}</td>
      <td style="padding:5px 0;font-size:13px;font-weight:600;color:${r.gold ? '#E9C349' : '#FFFFFF'};">${r.value}</td>
    </tr>`).join('');

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
      style="background-color:#1B1B1F;border:1px solid #2E2E35;border-left:4px solid #E9C349;border-radius:10px;margin:0 0 4px 0;">
      <tr><td style="padding:16px 20px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          ${rowsHtml}
        </table>
      </td></tr>
    </table>`;
}

interface BuildEmailOptions {
  preheader:      string;
  heading:        string;
  subheading?:    string;
  body:           string;
  ctaLabel?:      string;
  ctaLink?:       string;
  showDirectLink?: string;
  footerNote?:    string;
}

function buildEmail(opts: BuildEmailOptions): string {
  const year = new Date().getFullYear();

  const ctaBlock = opts.ctaLabel && opts.ctaLink ? `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:32px 0 24px 0;">
      <tr>
        <td align="center">
          <a href="${opts.ctaLink}" target="_blank"
            style="display:inline-block;background-color:#E9C349;color:#0F0F10;font-size:14px;font-weight:700;
                   text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.2px;
                   box-shadow:0 4px 14px rgba(233,195,73,0.3);">
            ${opts.ctaLabel}
          </a>
        </td>
      </tr>
    </table>` : '';

  const directLinkBlock = opts.showDirectLink ? `
    <p style="font-size:12px;color:#71717A;margin:0 0 8px 0;text-align:center;">
      Or copy and paste this link into your browser:
    </p>
    <p style="font-size:11px;color:#A1A1AA;word-break:break-all;background-color:#0E0E10;
              border:1px solid #27272A;border-radius:8px;padding:10px 12px;margin:0 0 24px 0;
              font-family:monospace;line-height:1.4;">
      ${opts.showDirectLink}
    </p>` : '';

  const footerNoteBlock = opts.footerNote ? `
    <div style="border-top:1px solid #27272A;padding-top:20px;margin-top:8px;">
      <p style="font-size:12px;line-height:1.6;color:#71717A;margin:0;">
        <strong style="color:#A1A1AA;">Note:</strong> ${opts.footerNote}
      </p>
    </div>` : '';

  const subheadingBlock = opts.subheading ? `
    <span style="font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;
                 color:#E9C349;font-weight:700;display:block;margin-top:2px;">${opts.subheading}</span>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${opts.heading}</title>
</head>
<body style="margin:0;padding:40px 16px;background-color:#0B0B0C;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
             color:#E4E4E7;">

  <!-- Preheader text (hidden, shows in email client previews) -->
  <span style="display:none;max-height:0;overflow:hidden;color:transparent;">${opts.preheader}</span>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
    style="max-width:580px;margin:0 auto;">

    <!-- ── Logo Header ── -->
    <tr>
      <td style="text-align:center;padding-bottom:28px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;">
              <div style="width:48px;height:48px;border-radius:50%;background-color:#E9C349;
                          display:flex;align-items:center;justify-content:center;
                          font-family:Georgia,serif;font-size:20px;font-weight:bold;color:#0F0F10;">
                H
              </div>
            </td>
            <td style="vertical-align:middle;text-align:left;">
              <span style="font-family:Georgia,serif;font-size:22px;font-weight:bold;
                           color:#FFFFFF;letter-spacing:0.5px;display:block;">Harmony College</span>
              ${subheadingBlock}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── Main Card ── -->
    <tr>
      <td style="background-color:#141416;border:1px solid #27272A;border-radius:16px;
                 padding:36px 32px;box-shadow:0 8px 30px rgba(0,0,0,0.5);">

        <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#FFFFFF;
                   margin:0 0 24px 0;text-align:center;">
          ${opts.heading}
        </h1>

        ${opts.body}
        ${ctaBlock}
        ${directLinkBlock}
        ${footerNoteBlock}

      </td>
    </tr>

    <!-- ── Footer ── -->
    <tr>
      <td style="text-align:center;padding-top:28px;">
        <p style="font-size:12px;color:#52525B;margin:0 0 4px 0;">
          &copy; ${year} Harmony College. All rights reserved.
        </p>
        <p style="font-size:11px;color:#3F3F46;margin:0;">
          Official Institutional Communication &bull; Addis Ababa, Ethiopia
        </p>
      </td>
    </tr>

  </table>
</body>
</html>`;
}
