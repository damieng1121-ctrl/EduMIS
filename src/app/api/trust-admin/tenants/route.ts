import { requireRole, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";

/** A Trust admin only ever sees the schools that belong to their own Trust — never the whole platform. */
export async function GET() {
  return withApiErrors(async () => {
    const session = await requireRole(["TRUST_ADMIN"]);
    if (!session.user.trustId) throw new AuthError("Your account isn't assigned to a Trust yet", 403);
    return prisma.tenant.findMany({
      where: { trustId: session.user.trustId },
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true, pupils: true } } },
    });
  });
}
