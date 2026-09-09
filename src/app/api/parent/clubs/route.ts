import { requireParentSession } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  return withApiErrors(async () => {
    const session = await requireParentSession();

    const [academicYear, myLinks] = await Promise.all([
      prisma.academicYear.findFirst({
        where: { tenantId: session.user.tenantId, isCurrent: true },
      }),
      prisma.pupilGuardian.findMany({
        where: { tenantId: session.user.tenantId, guardianId: session.user.id },
        orderBy: { priorityOrder: "asc" },
        select: {
          pupil: { select: { id: true, firstName: true, lastName: true, preferredName: true } },
        },
      }),
    ]);

    const children = myLinks.map((l) => l.pupil);
    const childIds = children.map((c) => c.id);

    if (!academicYear) {
      return { children, clubs: [] };
    }

    const clubs = await prisma.club.findMany({
      where: { tenantId: session.user.tenantId, academicYearId: academicYear.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      include: {
        staffLead: { select: { name: true, email: true } },
        _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
        memberships: {
          where: { pupilId: { in: childIds } },
          select: { pupilId: true, status: true },
        },
      },
    });

    return {
      children,
      clubs: clubs.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        dayOfWeek: c.dayOfWeek,
        startTime: c.startTime,
        endTime: c.endTime,
        capacity: c.capacity,
        staffLead: c.staffLead,
        activeCount: c._count.memberships,
        myChildrenMemberships: c.memberships,
      })),
    };
  });
}
