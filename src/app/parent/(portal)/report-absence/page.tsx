"use client";

import { useEffect, useState } from "react";
import { CalendarOff } from "lucide-react";

type Child = { relationship: string; pupil: { id: string; firstName: string; lastName: string; preferredName: string | null } };

type Reason = "ILLNESS" | "MEDICAL_APPOINTMENT" | "RELIGIOUS_OBSERVANCE" | "OTHER";

type Report = {
  id: string;
  startDate: string;
  endDate: string;
  reason: Reason;
  note: string | null;
  createdAt: string;
};

const REASON_LABELS: Record<Reason, string> = {
  ILLNESS: "Illness",
  MEDICAL_APPOINTMENT: "Medical / dental appointment",
  RELIGIOUS_OBSERVANCE: "Religious observance",
  OTHER: "Other",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportAbsencePage() {
  const [children, setChildren] = useState<Child[] | null>(null);
  const [pupilId, setPupilId] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [reason, setReason] = useState<Reason>("ILLNESS");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [reports, setReports] = useState<Report[] | null>(null);

  useEffect(() => {
    fetch("/api/parent/me")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Child[]) => {
        setChildren(data);
        if (data.length > 0) setPupilId(data[0].pupil.id);
      });
  }, []);

  useEffect(() => {
    if (!pupilId) return;
    fetch(`/api/parent/children/${pupilId}/absence`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setReports);
  }, [pupilId, success]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/parent/children/${pupilId}/absence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, reason, note: note || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Couldn't send that report.");
        return;
      }
      setNote("");
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          <CalendarOff size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Report an absence</h1>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">Let the school know your child won&apos;t be in — this goes straight to the office.</p>
        </div>
      </div>

      {children?.length === 0 && (
        <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">No children are linked to your account yet.</p>
      )}

      {children && children.length > 0 && (
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Child
            <select value={pupilId} onChange={(e) => setPupilId(e.target.value)} className={inputClass}>
              {children.map((c) => (
                <option key={c.pupil.id} value={c.pupil.id}>
                  {c.pupil.preferredName || c.pupil.firstName} {c.pupil.lastName}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              First day off
              <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Last day off
              <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Reason
            <select value={reason} onChange={(e) => setReason(e.target.value as Reason)} className={inputClass}>
              {(Object.keys(REASON_LABELS) as Reason[]).map((r) => (
                <option key={r} value={r}>{REASON_LABELS[r]}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Anything else the school should know? (optional)
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputClass} />
          </label>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-700 dark:text-green-300">Thanks — the school has been notified.</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send report"}
          </button>
        </form>
      )}

      {reports && reports.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Previously reported</h2>
          <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
            {reports.map((r) => (
              <li key={r.id} className="p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {new Date(r.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {r.startDate !== r.endDate && ` – ${new Date(r.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">{REASON_LABELS[r.reason]}</span>
                </div>
                {r.note && <p className="mt-1 text-slate-700 dark:text-slate-200">{r.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
