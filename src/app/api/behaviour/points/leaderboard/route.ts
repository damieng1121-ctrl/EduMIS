import { requireMisSession } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { Prisma, YearGroup } from "@prisma/client";

const YEAR_GROUPS = [
  "NURSERY", "RECEPTION", "YEAR_1", "YEAR_2", "YEAR_3", "YEAR_4", "YEAR_5",
  "YEAR_6", "YEAR_7", "YEAR_8", "YEAR_9", "YEAR_10", "YEAR_11", "YEAR_12", "YEAR_13",
] as const;

/** Points totals per pupil, sorted descending — optionally scoped to a form group or year group. */
export async function GET(req: Request) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const { searchParams } = new URL(req.url);
    const formGroupId = searchParams.get("formGroupId");
    const yearGroupParam = searchParams.get("yearGroup");
    const yearGroup = YEAR_GROUPS.includes(yearGroupParam as (typeof YEAR_GROUPS)[number])
      ? (yearGroupParam as YearGroup)
      : null;

    const pupilWhere: Prisma.PupilWhereInput = { tenantId: session.user.tenantId, isDeleted: false };
    if (formGroupId) pupilWhere.formGroupId = formGroupId;
    if (yearGroup) pupilWhere.yearGroup = yearGroup;

    const pupils = await prisma.pupil.findMany({
      where: pupilWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        yearGroup: true,
        formGroup: { select: { id: true, name: true } },
      },
    });

    const totals = await prisma.behaviourPointsEntry.groupBy({
      by: ["pupilId"],
      where: { tenantId: session.user.tenantId, pupilId: { in: pupils.map((p) => p.id) } },
      _sum: { points: true },
      _count: { _all: true },
    });
    const totalsByPupil = new Map(totals.map((t) => [t.pupilId, t]));

    return pupils
      .map((p) => ({
        pupilId: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        yearGroup: p.yearGroup,
        formGroup: p.formGroup,
        totalPoints: totalsByPupil.get(p.id)?._sum.points ?? 0,
        entryCount: totalsByPupil.get(p.id)?._count._all ?? 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  });
}
