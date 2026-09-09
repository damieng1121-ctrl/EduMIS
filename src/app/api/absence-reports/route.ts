import { requireMisSession } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * A parent's advance notice of a child's absence ("my child is off sick
 * today") — surfaced to staff so it's visible while taking the register,
 * not a substitute for actually marking attendance.
 */
export async function GET(req: Request) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const dateParam = new URL(req.url).searchParams.get("date");

    const where: Prisma.AbsenceReportWhereInput = { tenantId: session.user.tenantId };
    if (dateParam) {
      const day = new Date(dateParam);
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      // Reports covering (not just starting on) the given day — a
      // multi-day illness reported on day one should still show up on day two.
      where.startDate = { lt: end };
      where.endDate = { gte: start };
    }

    return prisma.absenceReport.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: {
        pupil: { select: { id: true, firstName: true, lastName: true, formGroup: { select: { name: true } } } },
        reportedBy: { select: { name: true, email: true } },
      },
    });
  });
}
