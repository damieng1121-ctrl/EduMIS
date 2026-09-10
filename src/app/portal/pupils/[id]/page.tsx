import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";
import { canAccessMis } from "@/lib/roles";
import { isAttendedSession, PERSISTENT_ABSENCE_THRESHOLD } from "@/lib/attendance-codes";
import { audit } from "@/lib/audit";
import type { YearGroup } from "@prisma/client";
import { PupilPhoto } from "./pupil-photo";
import { EditPupilForm } from "./edit-pupil-form";
import { PrintButton } from "@/components/ui/print-button";

function yearGroupLabel(yg: YearGroup): string {
  if (yg === "NURSERY") return "Nursery";
  if (yg === "RECEPTION") return "Reception";
  return `Year ${yg.replace("YEAR_", "")}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const SEND_STYLES: Record<string, string> = {
  SEND_SUPPORT: "bg-amber-100 text-amber-700",
  EHCP: "bg-purple-100 text-purple-700",
};

export default async function PupilProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.tenantId || !canAccessMis(session.user.role, session.user.isTeacher)) {
    notFound();
  }
  const tenantId = session.user.tenantId;
  const viewerIsAdmin = isAdmin(session.user.role);

  const pupil = await prisma.pupil.findUnique({
    where: { id },
    include: { formGroup: { select: { id: true, name: true, academicYearId: true } } },
  });
  if (!pupil || pupil.tenantId !== tenantId || pupil.isDeleted) notFound();

  // This page — not the /api/pupils/[id] route — is how a pupil's record
  // actually gets opened in practice, so the "who viewed this" trail has to
  // live here rather than (or as well as) on the API route.
  await audit({
    tenantId,
    userId: session.user.id,
    action: "pupil.viewed",
    entityType: "Pupil",
    entityId: pupil.id,
  });

  const currentYear = await prisma.academicYear.findFirst({
    where: { tenantId, isCurrent: true },
  });
  const yearForStats = currentYear ?? (await prisma.academicYear.findFirst({ where: { tenantId }, orderBy: { startDate: "desc" } }));

  const [attendanceRecords, behaviourIncidents, sendPlan, assessmentResults, interventions] = await Promise.all([
    yearForStats
      ? prisma.attendanceRecord.findMany({
          where: { tenantId, pupilId: id, date: { gte: yearForStats.startDate, lte: yearForStats.endDate } },
          select: { mark: true },
        })
      : Promise.resolve([]),
    prisma.behaviourIncident.findMany({
      where: {
        tenantId,
        pupilId: id,
        ...(viewerIsAdmin ? {} : { isConfidential: false }),
      },
      orderBy: { date: "desc" },
      take: 10,
      include: { recordedBy: { select: { name: true, email: true } } },
    }),
    pupil.sendStatus !== "NONE"
      ? prisma.sendPlan.findFirst({ where: { tenantId, pupilId: id }, orderBy: { updatedAt: "desc" } })
      : Promise.resolve(null),
    prisma.assessmentResult.findMany({
      where: { tenantId, pupilId: id },
      orderBy: { date: "desc" },
      take: 10,
      include: { subject: { select: { name: true } } },
    }),
    prisma.intervention.findMany({
      where: { tenantId, pupilId: id, status: { in: ["PLANNED", "ACTIVE"] } },
      orderBy: { startDate: "desc" },
      include: { provider: { select: { name: true, email: true } } },
    }),
  ]);

  const recordedSessions = attendanceRecords.filter((r) => r.mark !== "NOT_RECORDED");
  const attendedSessions = recordedSessions.filter((r) => isAttendedSession(r.mark));
  const attendancePct = recordedSessions.length ? attendedSessions.length / recordedSessions.length : null;
  const isPersistentAbsence = attendancePct !== null && attendancePct < PERSISTENT_ABSENCE_THRESHOLD;

  return (
    <div>
      <div className="flex items-start justify-between print:hidden">
        <div className="flex items-start gap-4">
          <PupilPhoto pupilId={pupil.id} hasPhoto={Boolean(pupil.photoUrl)} />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {pupil.preferredName || pupil.firstName} {pupil.lastName}
            </h1>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              DOB {formatDate(pupil.dob)} &middot; {yearGroupLabel(pupil.yearGroup)}
              {pupil.formGroup ? ` · ${pupil.formGroup.name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-start justify-end gap-1.5">
            <PrintButton label="Print profile" />
            <Link
              href={`/portal/pupils/${pupil.id}/report`}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Report
            </Link>
            {pupil.sendStatus !== "NONE" && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SEND_STYLES[pupil.sendStatus]}`}>
                {pupil.sendStatus === "SEND_SUPPORT" ? "SEND Support" : "EHCP"}
              </span>
            )}
            {pupil.pupilPremium && <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">Pupil Premium</span>}
            {pupil.freeSchoolMeals && <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">FSM</span>}
            {!pupil.isActive && <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">Inactive</span>}
          </div>
          <EditPupilForm
            pupil={{
              id: pupil.id,
              firstName: pupil.firstName,
              lastName: pupil.lastName,
              preferredName: pupil.preferredName,
              dob: pupil.dob.toISOString(),
              gender: pupil.gender,
              yearGroup: pupil.yearGroup,
              formGroupId: pupil.formGroupId,
              ethnicity: pupil.ethnicity,
              homeLanguage: pupil.homeLanguage,
              addressLine1: pupil.addressLine1,
              addressLine2: pupil.addressLine2,
              city: pupil.city,
              postcode: pupil.postcode,
              sendStatus: pupil.sendStatus,
              pupilPremium: pupil.pupilPremium,
              freeSchoolMeals: pupil.freeSchoolMeals,
              medicalNotes: pupil.medicalNotes,
              isActive: pupil.isActive,
            }}
            isAdmin={viewerIsAdmin}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">Attendance {yearForStats ? `(${yearForStats.name})` : ""}</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">
            {attendancePct === null ? "—" : `${(attendancePct * 100).toFixed(1)}%`}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{recordedSessions.length} sessions recorded</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">UPN</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{pupil.upn ?? "Not allocated"}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Admission no. {pupil.admissionNumber ?? "—"}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">Guardians</p>
          <Link href={`/portal/pupils/${pupil.id}/guardians`} className="mt-1 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            View / manage guardians &rarr;
          </Link>
        </div>
      </div>

      {isPersistentAbsence && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <strong>Persistent absence:</strong> attendance is below the {(PERSISTENT_ABSENCE_THRESHOLD * 100).toFixed(0)}% DfE threshold.
        </div>
      )}

      {pupil.sendStatus !== "NONE" && (
        <div className="mt-6 rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white">SEND plan</h2>
          {sendPlan ? (
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
              <p><span className="font-medium">Primary need:</span> {sendPlan.primaryNeed ?? "Not specified"}</p>
              <p className="mt-2 whitespace-pre-wrap">{sendPlan.description}</p>
              {sendPlan.reviewDate && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Next review: {formatDate(sendPlan.reviewDate)}</p>}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">No SEND plan on file yet.</p>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white">Recent behaviour incidents</h2>
          {behaviourIncidents.length === 0 ? (
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">No incidents recorded.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {behaviourIncidents.map((b) => (
                <li key={b.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 dark:text-white">{b.category.replaceAll("_", " ")}</span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">{formatDate(b.date)}</span>
                  </div>
                  <p className="mt-0.5 text-slate-700 dark:text-slate-200">{b.description}</p>
                  {b.points !== 0 && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{b.points > 0 ? "+" : ""}{b.points} points</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white">Recent assessment results</h2>
          {assessmentResults.length === 0 ? (
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">No assessment results yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {assessmentResults.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 dark:text-white">{a.subject.name}</span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">{a.term}</span>
                  </div>
                  <p className="mt-0.5 text-slate-700 dark:text-slate-200">{a.attainment}{a.effort ? ` · Effort: ${a.effort}` : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold text-slate-900 dark:text-white">Active interventions</h2>
        {interventions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">No active interventions.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {interventions.map((i) => (
              <li key={i.id} className="py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900 dark:text-white">{i.title}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">{i.status}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Led by {i.provider.name ?? i.provider.email} &middot; started {formatDate(i.startDate)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
