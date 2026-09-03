import { z } from "zod";
import { requireMisSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum(["SCHEDULED", "ATTENDED", "MISSED"]),
});

async function loadOwnDetention(id: string, tenantId: string) {
  const detention = await prisma.detention.findUnique({ where: { id } });
  if (!detention || detention.tenantId !== tenantId) throw new AuthError("Not found", 404);
  return detention;
}

export async function PATCH(req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const { id } = await params;
    await loadOwnDetention(id, session.user.tenantId);
    const body = patchSchema.parse(await req.json());

    return prisma.detention.update({
      where: { id },
      data: body,
      include: {
        pupil: { select: { firstName: true, lastName: true } },
        scheduledBy: { select: { name: true, email: true } },
      },
    });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    if (!isAdmin(session.user.role)) throw new AuthError("Only admins can delete detentions", 403);
    const { id } = await params;
    await loadOwnDetention(id, session.user.tenantId);

    await prisma.detention.delete({ where: { id } });
    return { ok: true };
  });
}
