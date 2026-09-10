"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Data = {
  pupil: { id: string; firstName: string; lastName: string; preferredName: string | null; yearGroup: string; dob: string; formGroup: { name: string } | null };
  attendance: { percent: number | null; isPersistentAbsence: boolean; sessionsRecorded: number };
  behaviourIncidents: { id: string; date: string; category: string; points: number; description: string; location: string | null }[];
  send: { status: string; primaryNeed: string | null } | null;
  assessmentResults: { id: string; term: string; attainment: string; effort: string | null; date: string; subject: { name: string } }[];
  targets: { id: string; title: string; description: string | null; targetDate: string | null; status: string; subject: { name: string } | null }[];
  mealRecords: { id: string; date: string; mealType: string }[];
  accidentReports: {
    id: string;
    date: string;
    time: string;
    location: string;
    description: string;
    injuryType: string | null;
    actionTaken: string;
    severity: "MINOR" | "MODERATE" | "SERIOUS";
    parentNotified: boolean;
  }[];
};

const CATEGORY_STYLES: Record<string, string> = {
  ACHIEVEMENT: "bg-green-100 text-green-700",
  CONCERN: "bg-amber-100 text-amber-700",
  BULLYING: "bg-red-100 text-red-700",
  SAFEGUARDING: "bg-red-100 text-red-700",
};

const TARGET_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ACHIEVED: "Achieved",
};

const TARGET_STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  ACHIEVED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

const MEAL_TYPE_LABEL: Record<string, string> = {
  SCHOOL_MEAL: "School meal",
  PACKED_LUNCH: "Packed lunch",
  HOME: "Home",
  FSM: "Free school meal",
};

const SEVERITY_STYLES: Record<string, string> = {
  MINOR: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MODERATE: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  SERIOUS: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function ParentChildPage() {
  const params = useParams<{ pupilId: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/parent/children/${params.pupilId}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? "Couldn't load this child's record");
        }
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [params.pupilId]);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>;

  const { pupil, attendance, behaviourIncidents, send, assessmentResults, targets, mealRecords, accidentReports } = data;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{pupil.preferredName || pupil.firstName} {pupil.lastName}</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {pupil.yearGroup.replace("_", " ")}
        {pupil.formGroup ? ` · ${pupil.formGroup.name}` : ""}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/parent/children/${pupil.id}/timetable`}
          className="inline-block rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          View timetable
        </Link>
        <Link
          href={`/parent/children/${pupil.id}/report`}
          className="inline-block rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          View full report
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">Attendance</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {attendance.percent !== null ? `${(attendance.percent * 100).toFixed(1)}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{attendance.sessionsRecorded} sessions recorded</p>
          {attendance.isPersistentAbsence && (
            <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">Below the 90% attendance threshold</p>
          )}
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 sm:col-span-2 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">SEND</p>
          {send ? (
            <div className="mt-2">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{send.status.replace("_", " ")}</p>
              {send.primaryNeed && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Primary need: {send.primaryNeed.replace("_", " ")}</p>}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">No SEND record.</p>
          )}
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900 dark:text-white">Academic progress</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent assessment results</h3>
          {assessmentResults.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">No assessment results yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {assessmentResults.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 dark:text-white">{a.subject.name}</span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">{a.term}</span>
                  </div>
                  <p className="mt-0.5 text-slate-700 dark:text-slate-200">
                    {a.attainment}
                    {a.effort ? ` · Effort: ${a.effort}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Targets</h3>
          {targets.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">No targets set.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {targets.map((t) => (
                <li key={t.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {t.title}
                      {t.subject && ` (${t.subject.name})`}
                    </p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${TARGET_STATUS_STYLES[t.status] ?? "bg-slate-100 text-slate-700"}`}>
                      {TARGET_STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </div>
                  {t.description && <p className="mt-1 text-slate-700 dark:text-slate-200">{t.description}</p>}
                  {t.targetDate && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Target date: {formatDate(t.targetDate)}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900 dark:text-white">Meal history</h2>
      <div className="mt-3 overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Meal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {mealRecords.map((m) => (
              <tr key={m.id}>
                <td className="p-4 text-slate-600 dark:text-slate-400">{formatDate(m.date)}</td>
                <td className="p-4 text-slate-700 dark:text-slate-200">{MEAL_TYPE_LABEL[m.mealType] ?? m.mealType}</td>
              </tr>
            ))}
            {mealRecords.length === 0 && (
              <tr>
                <td colSpan={2} className="p-6 text-center text-sm text-slate-700 dark:text-slate-200">No meal records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900 dark:text-white">First aid &amp; accident reports</h2>
      {accidentReports.length === 0 ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-700 dark:text-slate-200">No first aid or accident reports on file.</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {accidentReports.map((r) => (
            <li key={r.id} className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {formatDate(r.date)} <span className="font-normal text-slate-500 dark:text-slate-400">{r.time}</span> &middot; {r.location}
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[r.severity]}`}>
                  {r.severity.charAt(0) + r.severity.slice(1).toLowerCase()}
                </span>
              </div>
              {r.injuryType && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Injury: {r.injuryType}</p>}
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{r.description}</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200"><span className="font-medium">Action taken:</span> {r.actionTaken}</p>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                {r.parentNotified ? "Parent/guardian was notified" : "Parent/guardian not yet notified"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-lg font-semibold text-slate-900 dark:text-white">Behaviour</h2>
      <div className="mt-3 overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Category</th>
              <th className="p-4">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {behaviourIncidents.map((b) => (
              <tr key={b.id}>
                <td className="p-4 text-slate-600 dark:text-slate-400">{new Date(b.date).toLocaleDateString("en-GB")}</td>
                <td className="p-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[b.category] ?? "bg-slate-100 text-slate-600"}`}>
                    {b.category}
                  </span>
                </td>
                <td className="p-4 text-slate-700 dark:text-slate-200">{b.description}</td>
              </tr>
            ))}
            {behaviourIncidents.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-sm text-slate-700 dark:text-slate-200">No behaviour records.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
