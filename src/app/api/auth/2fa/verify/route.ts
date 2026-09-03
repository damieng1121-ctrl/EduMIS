import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { verifyTotpToken } from "@/lib/twofactor";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ token: z.string().min(6) });

// A 6-digit TOTP code only has a million combinations — 10 tries per 15
// minutes keeps guessing infeasible without getting in the way of someone
// who's fat-fingered their code a couple of times.
const VERIFY_ATTEMPT_LIMIT = 10;
const VERIFY_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Step-up verification for an already-authenticated but not-yet-2FA-verified
 * session. Deliberately uses `auth()` (not requireSession) since the whole
 * point of this route is to unblock a pending-2FA session.
 */
export async function POST(req: Request) {
  return withApiErrors(async () => {
    const session = await auth();
    if (!session?.user) throw new AuthError("Not authenticated", 401);

    const { token } = bodySchema.parse(await req.json());

    if (!rateLimit(`2fa-verify:${session.user.id}`, VERIFY_ATTEMPT_LIMIT, VERIFY_ATTEMPT_WINDOW_MS)) {
      return { ok: false, error: "Too many attempts — wait a few minutes and try again" };
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return { ok: true }; // nothing to verify
    }

    let verified = false;
    if (token.length === 6 && (await verifyTotpToken(token, decrypt(user.twoFactorSecret)))) {
      verified = true;
    } else {
      // Fall back to recovery codes (longer, hex strings)
      for (const [i, hashed] of user.twoFactorRecoveryCodes.entries()) {
        if (await bcrypt.compare(token, hashed)) {
          verified = true;
          const remaining = [...user.twoFactorRecoveryCodes];
          remaining.splice(i, 1);
          await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorRecoveryCodes: remaining },
          });
          break;
        }
      }
    }

    if (!verified) return { ok: false, error: "Invalid code" };

    await prisma.auditLog.create({
      data: { tenantId: user.tenantId, userId: user.id, action: "2fa.verified", entityType: "User", entityId: user.id },
    });

    return { ok: true };
  });
}
