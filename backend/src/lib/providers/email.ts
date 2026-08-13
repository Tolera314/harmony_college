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
}
