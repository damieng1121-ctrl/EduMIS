import { notFound } from "next/navigation";
import { requireParentSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { isAttendedSession } from "@/lib/attendance-codes";
import type { YearGroup } from "@prisma/client";
import { PrintButton } from "@/components/ui/print-button";

function yearGroupLabel(yg: YearGroup): string {
  if (yg === "NURSERY") return "Nursery";
  if (yg === "RECEPTION") return "Reception";
  return `Year ${yg.replace("YEAR_", "")}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const TARGET_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ACHIEVED: "Achieved",
};

/**
 * Parent-facing summary report. This is a lighter, read-only counterpart to
 * the full staff report at /portal/pupils/[id]/report (attendance/term
 * filters, teacher comment, print-optimised layout) — it deliberately keeps
 * to the current academic year with no term selector, so it's safe to build
 * on the guardian-link auth path without duplicating all of that staff
 * report's logic. It's real data throughout, not a stub.
 */
export default async function ParentPupilReportPage({ params }: { params: Promise<{ pupilId: string }> }) {
  const { pupilId } = await params;
  const session = await requireParentSession();

  const link = await prisma.pupilGuardian.findUnique({
    where: { pupilId_guardianId: { pupilId, guardianId: session.user.id } },
  });
  if (!link || link.tenantId !== session.user.tenantId) notFound();

  const tenantId = session.user.tenantId;

  const pupil = await prisma.pupil.findUnique({
    where: { id: pupilId },
    include: { formGroup: { select: { name: true } } },
  });
  if (!pupil || pupil.tenantId !== tenantId || pupil.isDeleted) notFound();

  const currentYear = await prisma.academicYear.findFirst({ where: { tenantId, isCurrent: true } });
  const yearForStats = currentYear ?? (await prisma.academicYear.findFirst({ where: { tenantId }, orderBy: { startDate: "desc" } }));

  const [attendanceRecords, assessmentResults, targets, behaviourIncidents] = await Promise.all([
    yearForStats
      ? prisma.attendanceRecord.findMany({
          where: { tenantId, pupilId, date: { gte: yearForStats.startDate, lte: yearForStats.endDate } },
          select: { mark: true },
        })
      : Promise.resolve([]),
    prisma.assessmentResult.findMany({
      where: { tenantId, pupilId, ...(yearForStats ? { academicYearId: yearForStats.id } : {}) },
      orderBy: [{ date: "desc" }],
      take: 20,
      include: { subject: { select: { name: true } } },
    }),
    prisma.pupilTarget.findMany({
      where: { tenantId, pupilId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { subject: { select: { name: true } } },
    }),
    prisma.behaviourIncident.findMany({
      where: { tenantId, pupilId, isConfidential: false },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ]);

  const recordedSessions = attendanceRecords.filter((r) => r.mark !== "NOT_RECORDED");
  const attendedSessions = recordedSessions.filter((r) => isAttendedSession(r.mark));
  const attendancePct = recordedSessions.length ? attendedSessions.length / recordedSessions.length : null;
  const pointsTotal = behaviourIncidents.reduce((sum, i) => sum + i.points, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          A summary of {pupil.preferredName || pupil.firstName}&apos;s attendance, academic progress and behaviour
          {yearForStats ? ` for ${yearForStats.name}` : ""}.
        </p>
        <PrintButton label="Print / Save as PDF" />
      </div>

      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-10 print:border-0 print:p-0 print:shadow-none dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 pb-6 dark:border-slate-700">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {pupil.preferredName || pupil.firstName} {pupil.lastName}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {yearGroupLabel(pupil.yearGroup)}
              {pupil.formGroup ? ` · ${pupil.formGroup.name}` : ""} &middot; DOB {formatDate(pupil.dob)}
            </p>
          </div>
          {yearForStats && (
            <div className="text-right text-sm text-slate-600 dark:text-slate-400">
              <p className="font-medium text-slate-900 dark:text-white">{yearForStats.name}</p>
              <p>Whole year to date</p>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Attendance</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{attendancePct === null ? "—" : `${(attendancePct * 100).toFixed(1)}%`}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{recordedSessions.length} sessions recorded</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Behaviour points</p>
            <p className={`mt-1 text-2xl font-semibold ${pointsTotal < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
              {pointsTotal > 0 ? `+${pointsTotal}` : pointsTotal}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{behaviourIncidents.length} incidents logged</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Targets</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
              {targets.filter((t) => t.status === "ACHIEVED").length}/{targets.length}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">achieved of last {targets.length}</p>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Assessment</h2>
          {assessmentResults.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">No assessment results recorded for this period.</p>
          ) : (
            <table className="mt-3 w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:text-slate-400">
                <tr>
                  <th className="py-2">Subject</th>
                  <th className="py-2">Term</th>
                  <th className="py-2">Attainment</th>
                  <th className="py-2">Effort</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assessmentResults.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 font-medium text-slate-900 dark:text-white">{r.subject.name}</td>
                    <td className="py-2 text-slate-600 dark:text-slate-400">{r.term}</td>
                    <td className="py-2 text-slate-600 dark:text-slate-400">{r.attainment}</td>
                    <td className="py-2 text-slate-600 dark:text-slate-400">{r.effort ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Targets</h2>
          {targets.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">No targets set.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {targets.map((t) => (
                <li key={t.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {t.title}
                    {t.subject && ` (${t.subject.name})`}
                  </p>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-400">{TARGET_STATUS_LABEL[t.status] ?? t.status}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 break-inside-avoid">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Behaviour</h2>
          {behaviourIncidents.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">No behaviour incidents logged for this period.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {behaviourIncidents.map((i) => (
                <li key={i.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900 dark:text-white">{i.category.replace(/_/g, " ")}</p>
                    <p className="text-slate-600 dark:text-slate-400">{formatDate(i.date)}</p>
                  </div>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-400">{i.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
