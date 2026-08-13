import type { SmsProvider } from './sms';

/**
 * Development-only SMS provider.
 * Logs the OTP to stdout instead of sending a real SMS.
 * Automatically used when SMS_PROVIDER is unset or "console".
 * NEVER use in production.
 */
export class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(to: string, code: string): Promise<{ success: boolean; error?: string }> {
    if (process.env.NODE_ENV === 'production') {
      console.error('[ConsoleSmsProvider] Must not be used in production.');
      return { success: false, error: 'Console provider not allowed in production.' };
    }
    console.log(`\n📱 [DEV SMS] ──────────────────────────`);
    console.log(`   To:   ${to}`);
    console.log(`   Code: ${code}`);
    console.log(`────────────────────────────────────────\n`);
    return { success: true };
  }
}
