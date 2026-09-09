import { z } from "zod";
import { requireParentSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ pupilId: string }> };

async function assertOwnPupil(tenantId: string, guardianId: string, pupilId: string) {
  const link = await prisma.pupilGuardian.findUnique({
    where: { pupilId_guardianId: { pupilId, guardianId } },
  });
  if (!link || link.tenantId !== tenantId) throw new AuthError("Not found", 404);
}

export async function GET(_req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireParentSession();
    const { pupilId } = await params;
    await assertOwnPupil(session.user.tenantId, session.user.id, pupilId);

    return prisma.absenceReport.findMany({
      where: { tenantId: session.user.tenantId, pupilId },
      orderBy: { startDate: "desc" },
      take: 20,
    });
  });
}

const createSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.enum(["ILLNESS", "MEDICAL_APPOINTMENT", "RELIGIOUS_OBSERVANCE", "OTHER"]),
  note: z.string().max(2000).optional(),
});

export async function POST(req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireParentSession();
    const { pupilId } = await params;
    await assertOwnPupil(session.user.tenantId, session.user.id, pupilId);

    const body = createSchema.parse(await req.json());
    if (body.endDate < body.startDate) throw new AuthError("End date can't be before the start date", 400);

    return prisma.absenceReport.create({
      data: {
        tenantId: session.user.tenantId,
        pupilId,
        reportedById: session.user.id,
        startDate: body.startDate,
        endDate: body.endDate,
        reason: body.reason,
        note: body.note,
      },
    });
  });
}
