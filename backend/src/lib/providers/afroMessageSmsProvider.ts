import type { SmsProvider } from './sms';

/**
 * AfroMessage SMS Provider (Ethiopian carrier gateway).
 * Configure via environment variables:
 *   AFROMESSAGE_API_KEY   — API key from afromessage.com
 *   AFROMESSAGE_SENDER_ID — registered sender name / shortcode
 */
export class AfroMessageSmsProvider implements SmsProvider {
  private readonly apiKey: string;
  private readonly senderId: string;

  constructor() {
    this.apiKey   = process.env.AFROMESSAGE_API_KEY   ?? '';
    this.senderId = process.env.AFROMESSAGE_SENDER_ID ?? 'HarmonyHC';
  }

  async sendOtp(to: string, code: string): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'AFROMESSAGE_API_KEY is not configured.' };
    }
    try {
      const body = {
        from:    this.senderId,
        to,
        message: `Your Harmony College verification code is: ${code}. It expires in 10 minutes. Do not share it with anyone.`,
      };
      const res = await fetch('https://api.afromessage.com/api/send', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `AfroMessage error ${res.status}: ${text.slice(0, 200)}` };
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'AfroMessage network error' };
    }
  }
}
