import { z } from "zod";
import { requireFeatureSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { canAccessMis } from "@/lib/roles";

export async function GET() {
  return withApiErrors(async () => {
    const session = await requireFeatureSession("CENSUS_EXTENDED");

    return prisma.pupil.findMany({
      where: { tenantId: session.user.tenantId, yearGroup: "RECEPTION", isActive: true, isDeleted: false },
      select: { id: true, firstName: true, lastName: true, eyfsProfileData: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  });
}

const elgScore = z.enum(["emerging", "expected", "exceeding"]);

const patchSchema = z.object({
  pupilId: z.string().min(1),
  data: z.record(z.string(), elgScore),
});

export async function PATCH(req: Request) {
  return withApiErrors(async () => {
    const session = await requireFeatureSession("CENSUS_EXTENDED");
    if (!canAccessMis(session.user.role, session.user.isTeacher)) {
      throw new AuthError("This area is only available to teachers and school admins", 403);
    }
    const body = patchSchema.parse(await req.json());

    const pupil = await prisma.pupil.findUnique({ where: { id: body.pupilId } });
    if (!pupil || pupil.tenantId !== session.user.tenantId) throw new AuthError("Pupil not found", 404);
    if (pupil.yearGroup !== "RECEPTION") throw new AuthError("EYFS Profile only applies to Reception-year pupils", 400);

    return prisma.pupil.update({
      where: { id: body.pupilId },
      data: { eyfsProfileData: body.data },
      select: { id: true, firstName: true, lastName: true, eyfsProfileData: true },
    });
  });
}
