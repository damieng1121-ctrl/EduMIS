import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getNotificationProvider } from "@/lib/notifications";

const TOKEN_TTL_HOURS = 48;

function setPasswordUrl(token: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3002";
  return `${base}/set-password?token=${token}`;
}

/**
 * Issues a one-time, time-boxed set-password link for a staff/admin account
 * (any User with role != PARENT) and emails it to them. Password sign-in is
 * an alternative to Google/Microsoft SSO, not a replacement — an account can
 * use either once a password is set. Same VerificationToken-reuse pattern as
 * parent-invite.ts, just under its own identifier prefix so the two can't be
 * confused (e.g. a parent link consumed against a staff account by mistake).
 * Safe to call again for the same person (e.g. "resend invite") — old unused
 * tokens for that email are cleared first so only the latest link works.
 */
export async function issueStaffSetPasswordToken(email: string): Promise<void> {
  const identifier = `staff-set-password:${email.toLowerCase()}`;
  await prisma.verificationToken.deleteMany({ where: { identifier } });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
  await prisma.verificationToken.create({ data: { identifier, token, expires } });

  const notifications = getNotificationProvider();
  const url = setPasswordUrl(token);
  await notifications.send({
    to: email,
    subject: "Set up your EduMIS account",
    text: `You've been added to EduMIS. You can sign in with Google/Microsoft SSO if your school uses it, or set a password here to sign in directly:\n\n${url}\n\nThis link expires in ${TOKEN_TTL_HOURS} hours.`,
    html: `<p>You've been added to EduMIS. You can sign in with Google/Microsoft SSO if your school uses it, or set a password here to sign in directly:</p><p><a href="${url}">${url}</a></p><p>This link expires in ${TOKEN_TTL_HOURS} hours.</p>`,
  });
}

/** Consumes a set-password token (single use) and returns the account's email, or null if invalid/expired. */
export async function consumeStaffSetPasswordToken(token: string): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || !record.identifier.startsWith("staff-set-password:")) return null;
  await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
  if (record.expires < new Date()) return null;
  return record.identifier.slice("staff-set-password:".length);
}
