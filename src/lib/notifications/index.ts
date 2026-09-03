import type { EmailMessage, NotificationProvider, SmsMessage, SmsProvider } from "./types";
import { ConsoleNotificationProvider } from "./console";
import { SmtpNotificationProvider } from "./smtp";
import { ConsoleSmsProvider } from "./sms-console";
import { TwilioSmsProvider } from "./twilio";

export type { NotificationProvider, SmsProvider } from "./types";

/** Wraps any provider so a flaky/misconfigured mail server never breaks the ticket flow it's notifying about. */
class SafeNotificationProvider implements NotificationProvider {
  constructor(private inner: NotificationProvider) {}
  get name() {
    return this.inner.name;
  }
  async send(message: EmailMessage): Promise<void> {
    try {
      await this.inner.send(message);
    } catch (err) {
      console.error(`[notifications:${this.inner.name}] send failed`, err);
    }
  }
}

class DisabledNotificationProvider implements NotificationProvider {
  readonly name = "disabled" as const;
  async send(): Promise<void> {}
}

/** Same wrapper as SafeNotificationProvider, for the SMS side — a Twilio outage shouldn't break the flow sending the alert. */
class SafeSmsProvider implements SmsProvider {
  constructor(private inner: SmsProvider) {}
  get name() {
    return this.inner.name;
  }
  async send(message: SmsMessage): Promise<void> {
    try {
      await this.inner.send(message);
    } catch (err) {
      console.error(`[notifications:sms:${this.inner.name}] send failed`, err);
    }
  }
}

class DisabledSmsProvider implements SmsProvider {
  readonly name = "disabled" as const;
  async send(): Promise<void> {}
}

let cached: NotificationProvider | null = null;
let cachedSms: SmsProvider | null = null;

/**
 * Notification sending is platform-wide (one SMTP relay), unlike the AI
 * provider which is per-tenant — schools don't bring their own mail server.
 */
export function getNotificationProvider(): NotificationProvider {
  if (cached) return cached;

  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    cached = new SafeNotificationProvider(
      new SmtpNotificationProvider({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM ?? "EduMIS <no-reply@edumis.app>",
      }),
    );
  } else if (process.env.NODE_ENV === "development") {
    cached = new SafeNotificationProvider(new ConsoleNotificationProvider());
  } else {
    cached = new DisabledNotificationProvider();
  }

  return cached;
}

/**
 * SMS is for the small set of alerts urgent enough that email isn't
 * reliable — attendance/safeguarding notices — not a general channel, so
 * unlike email it's fine for this to be silently a no-op until a school's
 * Twilio credentials are configured.
 */
export function getSmsProvider(): SmsProvider {
  if (cachedSms) return cachedSms;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (accountSid && authToken && from) {
    cachedSms = new SafeSmsProvider(new TwilioSmsProvider({ accountSid, authToken, from }));
  } else if (process.env.NODE_ENV === "development") {
    cachedSms = new SafeSmsProvider(new ConsoleSmsProvider());
  } else {
    cachedSms = new DisabledSmsProvider();
  }

  return cachedSms;
}

/**
 * UK mobile numbers are entered every possible way (07..., +447..., with
 * spaces) — normalise to E.164 before handing to Twilio, which rejects
 * anything else. Returns null (skip, don't throw) for anything that isn't
 * recognisably a UK mobile, since a guardian's phone field is free text.
 */
export function toE164UK(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+44")) return digits;
  if (digits.startsWith("0")) return `+44${digits.slice(1)}`;
  if (digits.startsWith("44")) return `+${digits}`;
  return null;
}
