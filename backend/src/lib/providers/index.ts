/**
 * Provider factories — select implementation via environment variables.
 *
 * SMS_PROVIDER:   "console" (default) | "afromessage" | "geez"
 * EMAIL_PROVIDER: "console" (default) | "resend" | "sendgrid"
 */
import type { SmsProvider }   from './sms';
import type { EmailProvider } from './email';
import { ConsoleSmsProvider }       from './consoleSmsProvider';
import { AfroMessageSmsProvider }   from './afroMessageSmsProvider';
import { GeezSmsSmsProvider }       from './geezSmsSmsProvider';
import { ConsoleEmailProvider }     from './consoleEmailProvider';
import { ResendEmailProvider }      from './resendEmailProvider';
import { SendGridEmailProvider }    from './sendGridEmailProvider';

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
    case 'resend':    return new ResendEmailProvider();
    case 'sendgrid':  return new SendGridEmailProvider();
    default:          return new ConsoleEmailProvider();
  }
}

export type { SmsProvider, EmailProvider };
