import { z } from "zod";
import { requireMisSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  date: z.coerce.date().optional(),
  time: z.string().min(1).max(10).optional(),
  location: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(4000).optional(),
  injuryType: z.string().max(200).optional(),
  actionTaken: z.string().min(1).max(4000).optional(),
  severity: z.enum(["MINOR", "MODERATE", "SERIOUS"]).optional(),
  parentNotified: z.boolean().optional(),
  firstAidGivenById: z.string().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const { id } = await params;

    const record = await prisma.accidentReport.findUnique({ where: { id } });
    if (!record || record.tenantId !== session.user.tenantId) throw new AuthError("Not found", 404);

    const body = patchSchema.parse(await req.json());
    const { parentNotified, ...rest } = body;

    return prisma.accidentReport.update({
      where: { id },
      data: {
        ...rest,
        ...(parentNotified !== undefined
          ? { parentNotified, parentNotifiedAt: parentNotified ? new Date() : null }
          : {}),
      },
      include: {
        pupil: { select: { id: true, firstName: true, lastName: true } },
        reportedBy: { select: { name: true, email: true } },
        firstAidGivenBy: { select: { name: true, email: true } },
      },
    });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    if (!isAdmin(session.user.role)) throw new AuthError("Only admins can delete accident/first aid reports", 403);
    const { id } = await params;

    const record = await prisma.accidentReport.findUnique({ where: { id } });
    if (!record || record.tenantId !== session.user.tenantId) throw new AuthError("Not found", 404);

    await prisma.accidentReport.delete({ where: { id } });
    return { ok: true };
  });
}
