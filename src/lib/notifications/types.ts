export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  /** Optional HTML alternative body — plain-text `text` is always sent too as a fallback. */
  html?: string;
}

export interface NotificationProvider {
  readonly name: "smtp" | "console" | "disabled";
  send(message: EmailMessage): Promise<void>;
}

export interface SmsMessage {
  /** E.164 format (e.g. "+447700900123") — the caller is responsible for normalising a UK-style "07..." number before this point. */
  to: string;
  body: string;
}

export interface SmsProvider {
  readonly name: "twilio" | "console" | "disabled";
  send(message: SmsMessage): Promise<void>;
}
