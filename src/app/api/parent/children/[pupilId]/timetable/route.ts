import { requireParentSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type Params = { params: Promise<{ pupilId: string }> };

const SLOT_INCLUDE = {
  subject: { select: { id: true, name: true } },
  teacher: { select: { id: true, name: true, email: true } },
} satisfies Prisma.TimetableSlotInclude;

export async function GET(_req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireParentSession();
    const { pupilId } = await params;

    const link = await prisma.pupilGuardian.findUnique({
      where: { pupilId_guardianId: { pupilId, guardianId: session.user.id } },
    });
    if (!link || link.tenantId !== session.user.tenantId) throw new AuthError("Not found", 404);

    const pupil = await prisma.pupil.findUnique({
      where: { id: pupilId },
      select: { formGroupId: true },
    });
    if (!pupil) throw new AuthError("Not found", 404);

    if (!pupil.formGroupId) {
      return { formGroup: null, slots: [] };
    }

    const [formGroup, slots] = await Promise.all([
      prisma.formGroup.findUnique({
        where: { id: pupil.formGroupId },
        select: { id: true, name: true },
      }),
      prisma.timetableSlot.findMany({
        where: { tenantId: session.user.tenantId, formGroupId: pupil.formGroupId },
        orderBy: [{ dayOfWeek: "asc" }, { periodNumber: "asc" }],
        include: SLOT_INCLUDE,
      }),
    ]);

    return { formGroup, slots };
  });
}
