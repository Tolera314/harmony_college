import type { SmsProvider } from './sms';

/**
 * Geez SMS Provider (alternative Ethiopian SMS gateway).
 * Configure via environment variables:
 *   GEEZSMS_API_KEY  — API key
 *   GEEZSMS_SENDER   — registered sender name
 */
export class GeezSmsSmsProvider implements SmsProvider {
  private readonly apiKey: string;
  private readonly sender: string;

  constructor() {
    this.apiKey = process.env.GEEZSMS_API_KEY ?? '';
    this.sender = process.env.GEEZSMS_SENDER  ?? 'HarmonyHC';
  }

  async sendOtp(to: string, code: string): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'GEEZSMS_API_KEY is not configured.' };
    }
    try {
      const res = await fetch('https://api.geezsms.com/v1/sms/send', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          sender:  this.sender,
          to,
          message: `Your Harmony College verification code is: ${code}. Valid for 10 minutes.`,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `GeezSMS error ${res.status}: ${text.slice(0, 200)}` };
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'GeezSMS network error' };
    }
  }
}
