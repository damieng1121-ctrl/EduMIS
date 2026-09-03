import type { SmsMessage, SmsProvider } from "./types";

/**
 * Talks to Twilio's REST API directly over fetch rather than pulling in
 * their SDK — this is one endpoint, form-encoded, Basic Auth, and it's not
 * worth a new dependency for that.
 */
export class TwilioSmsProvider implements SmsProvider {
  readonly name = "twilio" as const;
  private accountSid: string;
  private authToken: string;
  private from: string;

  constructor(opts: { accountSid: string; authToken: string; from: string }) {
    this.accountSid = opts.accountSid;
    this.authToken = opts.authToken;
    this.from = opts.from;
  }

  async send(message: SmsMessage): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: message.to, From: this.from, Body: message.body }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Twilio send failed (${res.status}): ${detail}`);
    }
  }
}
