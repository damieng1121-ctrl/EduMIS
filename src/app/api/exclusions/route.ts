import { z } from "zod";
import { requireFeatureSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";

export async function GET() {
  return withApiErrors(async () => {
    const session = await requireFeatureSession("CENSUS_EXTENDED");

    return prisma.exclusion.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { startDate: "desc" },
      include: {
        pupil: { select: { firstName: true, lastName: true, yearGroup: true } },
      },
    });
  });
}

const createSchema = z.object({
  pupilId: z.string().min(1),
  type: z.enum(["FIXED_TERM", "PERMANENT"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  sessionsLost: z.number().int().optional(),
  reason: z.string().min(1),
});

export async function POST(req: Request) {
  return withApiErrors(async () => {
    const session = await requireFeatureSession("CENSUS_EXTENDED");
    if (!isAdmin(session.user.role)) throw new AuthError("This area is only available to school admins", 403);
    const body = createSchema.parse(await req.json());

    const pupil = await prisma.pupil.findUnique({ where: { id: body.pupilId } });
    if (!pupil || pupil.tenantId !== session.user.tenantId) throw new AuthError("Pupil not found", 404);

    return prisma.exclusion.create({
      data: {
        ...body,
        tenantId: session.user.tenantId,
        recordedById: session.user.id,
      },
      include: {
        pupil: { select: { firstName: true, lastName: true, yearGroup: true } },
      },
    });
  });
}
