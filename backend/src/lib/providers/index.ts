/**
 * Provider factories — select implementation via environment variables.
 *
 * SMS_PROVIDER:   "console" (default) | "afromessage" | "geez"
 * EMAIL_PROVIDER: "console" (default) | "brevo"
 */
import type { SmsProvider }   from './sms';
import type { EmailProvider } from './email';
import { ConsoleSmsProvider }       from './consoleSmsProvider';
import { AfroMessageSmsProvider }   from './afroMessageSmsProvider';
import { GeezSmsSmsProvider }       from './geezSmsSmsProvider';
import { ConsoleEmailProvider }     from './consoleEmailProvider';
import { BrevoEmailProvider }       from './brevoEmailProvider';

export function getSmsProvider(): SmsProvider {
  const p = (process.env.SMS_PROVIDER ?? 'console').toLowerCase();
  switch (p) {
    case 'afromessage': return new AfroMessageSmsProvider();
    case 'geez':        return new GeezSmsSmsProvider();
    default:            return new ConsoleSmsProvider();
  }
}

export function getEmailProvider(): EmailProvider {
  const p = (process.env.EMAIL_PROVIDER ?? 'console').toLowerCase();
  switch (p) {
    case 'brevo':   return new BrevoEmailProvider();
    default:        return new ConsoleEmailProvider();
  }
}

export type { SmsProvider, EmailProvider };
