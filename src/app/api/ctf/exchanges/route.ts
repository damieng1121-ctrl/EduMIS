import { requireFeatureSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";

/** Audit trail of this school's CTF exports/imports, for the CTF exchange page. */
export async function GET() {
  return withApiErrors(async () => {
    const session = await requireFeatureSession("CTF_EXCHANGE");
    if (!isAdmin(session.user.role)) throw new AuthError("This area is only available to school admins", 403);

    return prisma.ctfExchange.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { performedBy: { select: { name: true, email: true } } },
    });
  });
}
