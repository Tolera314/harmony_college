/**
 * Email Provider Interface
 * Swap implementations via EMAIL_PROVIDER env var.
 */
export interface EmailProvider {
  sendVerificationEmail(
    to: string,
    params: {
      fullName: string;
      verificationLink: string;
      expiresInMinutes: number;
    }
  ): Promise<{ success: boolean; error?: string }>;

  sendPasswordResetEmail(
    to: string,
    params: {
      fullName: string;
      resetLink: string;
      expiresInMinutes: number;
    }
  ): Promise<{ success: boolean; error?: string }>;

  /**
   * General-purpose HR notification email.
   * Used for leave approval/rejection, payroll approval, contract expiry alerts.
   */
  sendHrNotificationEmail(
    to: string,
    params: {
      recipientName: string;
      subject:       string;
      heading:       string;
      body:          string;  // plain-text body, will be rendered as simple HTML
    }
  ): Promise<{ success: boolean; error?: string }>;

  sendStaffInvitationEmail(
    to: string,
    params: {
      fullName:       string;
      role:           string;
      departmentName: string;
      invitationLink: string;
      expiresInHours: number;
    }
  ): Promise<{ success: boolean; error?: string }>;

  /**
   * Official Harmony College employee/instructor account activation email.
   */
  sendAccountActivationEmail(
    to: string,
    params: {
      fullName:       string;
      role:           string;
      position:       string;
      departmentName: string;
      activationLink: string;
      expiresInHours: number;
    }
  ): Promise<{ success: boolean; error?: string }>;
}
