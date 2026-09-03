import { requireMisSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    if (!isAdmin(session.user.role)) throw new AuthError("Only admins can delete points entries", 403);
    const { id } = await params;

    const entry = await prisma.behaviourPointsEntry.findUnique({ where: { id } });
    if (!entry || entry.tenantId !== session.user.tenantId) throw new AuthError("Not found", 404);

    await prisma.behaviourPointsEntry.delete({ where: { id } });
    return { ok: true };
  });
}
