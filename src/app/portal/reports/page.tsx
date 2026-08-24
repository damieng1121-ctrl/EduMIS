"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AttendanceTrendChart, BehaviourPointsChart, AssessmentDistributionChart } from "@/components/mis-charts";

type Summary = {
  attendanceTrend: { week: string; attendancePct: number }[];
  persistentAbsence: { id: string; name: string; totalSessions: number; attendancePct: number | null }[];
  behaviourPoints: { category: string; points: number }[];
  assessmentDistribution: { attainment: string; count: number }[];
  subjects: { id: string; name: string }[];
};

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryDenied, setSummaryDenied] = useState(false);
  const [subjectId, setSubjectId] = useState("");

  useEffect(() => {
    const query = subjectId ? `?subjectId=${subjectId}` : "";
    fetch(`/api/reports/summary${query}`).then((r) => {
      if (!r.ok) {
        setSummaryDenied(true);
        return;
      }
      r.json().then(setSummary);
    });
  }, [subjectId]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>

      {summaryDenied ? (
        <AccessDenied />
      ) : summary ? (
        <MisReports summary={summary} subjectId={subjectId} onSubjectChange={setSubjectId} />
      ) : (
        <Loading />
      )}
    </div>
  );
}

function AccessDenied() {
  return <p className="mt-6 text-sm text-slate-700">You don&apos;t have access to this section.</p>;
}

function Loading() {
  return <p className="mt-6 text-sm text-slate-700">Loading…</p>;
}

function MisReports({
  summary,
  subjectId,
  onSubjectChange,
}: {
  summary: Summary;
  subjectId: string;
  onSubjectChange: (id: string) => void;
}) {
  return (
    <div>
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Attendance trend (last 8 weeks)</h2>
          <AttendanceTrendChart trend={summary.attendanceTrend} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Behaviour points by category</h2>
          <BehaviourPointsChart points={summary.behaviourPoints} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Assessment distribution</h2>
            {summary.subjects.length > 0 && (
              <select
                value={subjectId}
                onChange={(e) => onSubjectChange(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700"
              >
                <option value="">All subjects</option>
                {summary.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <AssessmentDistributionChart data={summary.assessmentDistribution} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Persistent absence (below 90%)</h2>
          {summary.persistentAbsence.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No pupils currently below the persistent-absence threshold.</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="pb-2 font-medium">Pupil</th>
                  <th className="pb-2 font-medium">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {summary.persistentAbsence.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-2">
                      <Link href={`/portal/pupils/${p.id}`} className="text-indigo-700 hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-2 text-red-600">{p.attendancePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
