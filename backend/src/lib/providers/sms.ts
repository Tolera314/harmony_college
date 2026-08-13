/**
 * SMS Provider Interface
 * Swap implementations via SMS_PROVIDER env var.
 */
export interface SmsProvider {
  sendOtp(to: string, code: string): Promise<{ success: boolean; error?: string }>;
}
