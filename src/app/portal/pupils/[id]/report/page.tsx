import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessMis, isAdmin } from "@/lib/roles";
import { isAttendedSession } from "@/lib/attendance-codes";
import { ReportControls } from "./report-controls";
import { TeacherComment } from "./teacher-comment";
import type { YearGroup } from "@prisma/client";

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
  NOT_ACHIEVED: "Not achieved",
};

export default async function PupilReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ academicYearId?: string; term?: string }>;
}) {
  const { id } = await params;
  const { academicYearId, term } = await searchParams;
  const session = await auth();
  if (!session?.user?.tenantId || !canAccessMis(session.user.role, session.user.isTeacher)) {
    notFound();
  }
  const tenantId = session.user.tenantId;
  const viewerIsAdmin = isAdmin(session.user.role);

  const pupil = await prisma.pupil.findUnique({
    where: { id },
    include: { formGroup: { select: { name: true } } },
  });
  if (!pupil || pupil.tenantId !== tenantId || pupil.isDeleted) notFound();

  const academicYears = await prisma.academicYear.findMany({
    where: { tenantId },
    orderBy: { startDate: "desc" },
  });
  if (academicYears.length === 0) notFound();

  const selectedYear = academicYearId
    ? (academicYears.find((y) => y.id === academicYearId) ?? academicYears.find((y) => y.isCurrent) ?? academicYears[0])
    : (academicYears.find((y) => y.isCurrent) ?? academicYears[0]);
  const selectedTerm = term ?? "ALL";

  const [attendanceRecords, allTermsResults, targets] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { tenantId, pupilId: id, date: { gte: selectedYear.startDate, lte: selectedYear.endDate } },
      select: { mark: true },
    }),
    prisma.assessmentResult.findMany({
      where: { tenantId, pupilId: id, academicYearId: selectedYear.id },
      orderBy: [{ term: "asc" }, { subject: { order: "asc" } }],
      include: { subject: { select: { name: true } } },
    }),
    prisma.pupilTarget.findMany({
      where: { tenantId, pupilId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { subject: { select: { name: true } } },
    }),
  ]);

  const terms = Array.from(new Set(allTermsResults.map((r) => r.term))).sort();
  const assessmentResults = selectedTerm === "ALL" ? allTermsResults : allTermsResults.filter((r) => r.term === selectedTerm);

  const behaviourIncidents = await prisma.behaviourIncident.findMany({
    where: {
      tenantId,
      pupilId: id,
      date: { gte: selectedYear.startDate, lte: selectedYear.endDate },
      ...(viewerIsAdmin ? {} : { isConfidential: false }),
    },
    orderBy: { date: "desc" },
  });

  const recordedSessions = attendanceRecords.filter((r) => r.mark !== "NOT_RECORDED");
  const attendedSessions = recordedSessions.filter((r) => isAttendedSession(r.mark));
  const attendancePct = recordedSessions.length ? attendedSessions.length / recordedSessions.length : null;
  const pointsTotal = behaviourIncidents.reduce((sum, i) => sum + i.points, 0);

  return (
    <div>
      <ReportControls
        pupilId={pupil.id}
        academicYears={academicYears.map((y) => ({ id: y.id, name: y.name }))}
        selectedYearId={selectedYear.id}
        terms={terms}
        selectedTerm={selectedTerm}
      />

      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-10 print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {pupil.preferredName || pupil.firstName} {pupil.lastName}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {yearGroupLabel(pupil.yearGroup)}
              {pupil.formGroup ? ` · ${pupil.formGroup.name}` : ""} &middot; DOB {formatDate(pupil.dob)}
            </p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p className="font-medium text-slate-900">{selectedYear.name}</p>
            <p>{selectedTerm === "ALL" ? "Whole year" : selectedTerm}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-600">Attendance</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{attendancePct === null ? "—" : `${(attendancePct * 100).toFixed(1)}%`}</p>
            <p className="mt-1 text-xs text-slate-600">{recordedSessions.length} sessions recorded</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-600">Behaviour points</p>
            <p className={`mt-1 text-2xl font-semibold ${pointsTotal < 0 ? "text-rose-600" : "text-slate-900"}`}>{pointsTotal > 0 ? `+${pointsTotal}` : pointsTotal}</p>
            <p className="mt-1 text-xs text-slate-600">{behaviourIncidents.length} incidents logged</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-600">Targets</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{targets.filter((t) => t.status === "ACHIEVED").length}/{targets.length}</p>
            <p className="mt-1 text-xs text-slate-600">achieved of last {targets.length}</p>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Assessment</h2>
          {assessmentResults.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No assessment results recorded for this period.</p>
          ) : (
            <table className="mt-3 w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="py-2">Subject</th>
                  <th className="py-2">Term</th>
                  <th className="py-2">Attainment</th>
                  <th className="py-2">Effort</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assessmentResults.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 font-medium text-slate-900">{r.subject.name}</td>
                    <td className="py-2 text-slate-600">{r.term}</td>
                    <td className="py-2 text-slate-600">{r.attainment}</td>
                    <td className="py-2 text-slate-600">{r.effort ?? "—"}</td>
                    <td className="py-2 text-slate-600">{r.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Targets</h2>
          {targets.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No targets set.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {targets.map((t) => (
                <li key={t.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-900">
                    {t.title}
                    {t.subject && ` (${t.subject.name})`}
                  </p>
                  <p className="mt-0.5 text-slate-600">{TARGET_STATUS_LABEL[t.status] ?? t.status}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 break-inside-avoid">
          <h2 className="text-lg font-semibold text-slate-900">Behaviour</h2>
          {behaviourIncidents.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No behaviour incidents logged for this period.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {behaviourIncidents.map((i) => (
                <li key={i.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{i.category.replace(/_/g, " ")}</p>
                    <p className="text-slate-600">{formatDate(i.date)}</p>
                  </div>
                  <p className="mt-0.5 text-slate-600">{i.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold text-slate-900">Teacher comment</h2>
          <TeacherComment />
        </section>
      </div>
    </div>
  );
}
