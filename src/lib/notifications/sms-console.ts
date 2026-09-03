import type { SmsMessage, SmsProvider } from "./types";

/** Dev/demo default: just logs what would have been sent. */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = "console" as const;

  async send(message: SmsMessage): Promise<void> {
    console.log(`[notifications] would SMS ${message.to}: "${message.body}"`);
  }
}
