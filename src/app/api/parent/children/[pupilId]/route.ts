import { requireParentSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isAttendedSession, PERSISTENT_ABSENCE_THRESHOLD } from "@/lib/attendance-codes";

type Params = { params: Promise<{ pupilId: string }> };

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
      select: {
        id: true,
        firstName: true,
        lastName: true,
        preferredName: true,
        yearGroup: true,
        dob: true,
        sendStatus: true,
        formGroup: { select: { id: true, name: true } },
      },
    });
    if (!pupil) throw new AuthError("Not found", 404);

    const [attendanceRecords, behaviourIncidents, latestSendPlan, assessmentResults, targets, mealRecords, accidentReports] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { tenantId: session.user.tenantId, pupilId, mark: { not: "NOT_RECORDED" } },
        select: { mark: true },
      }),
      prisma.behaviourIncident.findMany({
        where: { tenantId: session.user.tenantId, pupilId, isConfidential: false },
        orderBy: { date: "desc" },
        select: { id: true, date: true, category: true, points: true, description: true, location: true },
      }),
      pupil.sendStatus !== "NONE"
        ? prisma.sendPlan.findFirst({
            where: { tenantId: session.user.tenantId, pupilId },
            orderBy: { createdAt: "desc" },
            select: { primaryNeed: true },
          })
        : Promise.resolve(null),
      prisma.assessmentResult.findMany({
        where: { tenantId: session.user.tenantId, pupilId },
        orderBy: { date: "desc" },
        take: 20,
        select: { id: true, term: true, attainment: true, effort: true, date: true, subject: { select: { name: true } } },
      }),
      prisma.pupilTarget.findMany({
        where: { tenantId: session.user.tenantId, pupilId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, title: true, description: true, targetDate: true, status: true, subject: { select: { name: true } } },
      }),
      prisma.mealRecord.findMany({
        where: { tenantId: session.user.tenantId, pupilId },
        orderBy: { date: "desc" },
        take: 20,
        select: { id: true, date: true, mealType: true },
      }),
      prisma.accidentReport.findMany({
        where: { tenantId: session.user.tenantId, pupilId },
        orderBy: { date: "desc" },
        take: 20,
        select: {
          id: true,
          date: true,
          time: true,
          location: true,
          description: true,
          injuryType: true,
          actionTaken: true,
          severity: true,
          parentNotified: true,
        },
      }),
    ]);

    const attended = attendanceRecords.filter((r) => isAttendedSession(r.mark)).length;
    const total = attendanceRecords.length;
    const attendancePercent = total > 0 ? attended / total : null;

    return {
      pupil,
      attendance: {
        percent: attendancePercent,
        isPersistentAbsence: attendancePercent !== null && attendancePercent < PERSISTENT_ABSENCE_THRESHOLD,
        sessionsRecorded: total,
      },
      behaviourIncidents,
      send:
        pupil.sendStatus !== "NONE"
          ? { status: pupil.sendStatus, primaryNeed: latestSendPlan?.primaryNeed ?? null }
          : null,
      assessmentResults,
      targets,
      mealRecords,
      accidentReports,
    };
  });
}
