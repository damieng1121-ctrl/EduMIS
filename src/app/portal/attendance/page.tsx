"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { CalendarOff } from "lucide-react";
import { ATTENDANCE_CODES, getAttendanceCode, isAttendedSession } from "@/lib/attendance-codes";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { PrintButton } from "@/components/ui/print-button";

type FormGroup = { id: string; name: string; yearGroup: string };

type RegisterEntry = {
  pupil: { id: string; firstName: string; lastName: string; preferredName: string | null };
  record: { statutoryCode: string; minutesLate: number | null; notes: string | null } | null;
};

const ABSENCE_REASON_LABELS: Record<string, string> = {
  ILLNESS: "Illness",
  MEDICAL_APPOINTMENT: "Medical / dental appointment",
  RELIGIOUS_OBSERVANCE: "Religious observance",
  OTHER: "Other",
};

type AbsenceReport = {
  id: string;
  reason: string;
  note: string | null;
  pupil: { id: string; firstName: string; lastName: string; formGroup: { name: string } | null };
  reportedBy: { name: string | null; email: string | null };
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const [formGroups, setFormGroups] = useState<FormGroup[] | null>(null);
  const [formGroupId, setFormGroupId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [attSession, setAttSession] = useState<"AM" | "PM">("AM");

  const [entries, setEntries] = useState<RegisterEntry[] | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [absenceReports, setAbsenceReports] = useState<AbsenceReport[]>([]);

  useEffect(() => {
    fetch("/api/form-groups")
      .then((r) => (r.ok ? r.json() : []))
      .then((groups: FormGroup[]) => {
        setFormGroups(groups);
        if (groups.length > 0) setFormGroupId((prev) => prev || groups[0].id);
      });
  }, []);

  function loadRegister() {
    if (!formGroupId || !date || !attSession) return;
    const params = new URLSearchParams({ formGroupId, date, session: attSession });
    fetch(`/api/attendance?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: RegisterEntry[]) => {
        setEntries(data);
        const next: Record<string, string> = {};
        for (const e of data) {
          next[e.pupil.id] = e.record?.statutoryCode ?? "";
        }
        setCodes(next);
      });
  }

  useEffect(loadRegister, [formGroupId, date, attSession]);

  useEffect(() => {
    if (!date) return;
    fetch(`/api/absence-reports?date=${date}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setAbsenceReports);
  }, [date]);

  async function saveRegister() {
    if (!formGroupId) return;
    setSaving(true);
    setSavedMsg("");
    try {
      const entriesPayload = Object.entries(codes)
        .filter(([, code]) => code)
        .map(([pupilId, code]) => {
          const info = getAttendanceCode(code);
          return {
            pupilId,
            mark: info?.mark ?? "NOT_RECORDED",
            statutoryCode: code,
          };
        });
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formGroupId, date, session: attSession, entries: entriesPayload }),
      });
      if (res.ok) {
        setSavedMsg("Register saved.");
        loadRegister();
      }
    } finally {
      setSaving(false);
    }
  }

  const summary = useMemo(() => {
    if (!entries) return { present: 0, absent: 0, notRecorded: 0 };
    let present = 0;
    let absent = 0;
    let notRecorded = 0;
    for (const e of entries) {
      const code = codes[e.pupil.id];
      if (!code) {
        notRecorded += 1;
        continue;
      }
      const info = getAttendanceCode(code);
      if (info && isAttendedSession(info.mark)) present += 1;
      else absent += 1;
    }
    return { present, absent, notRecorded };
  }, [entries, codes]);

  return (
    <div>
      <PageHeader module="attendance" title="Attendance register" actions={<PrintButton label="Print register" />} />

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <label className="text-xs text-slate-600 dark:text-slate-400">
          Form group
          <select value={formGroupId} onChange={(e) => setFormGroupId(e.target.value)} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">
            {formGroups?.map((fg) => (
              <option key={fg.id} value={fg.id}>{fg.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-600 dark:text-slate-400">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600" />
        </label>
        <label className="text-xs text-slate-600 dark:text-slate-400">
          Session
          <select value={attSession} onChange={(e) => setAttSession(e.target.value as "AM" | "PM")} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </label>
        <Button onClick={saveRegister} disabled={saving || !formGroupId} className="ml-auto">
          {saving ? "Saving…" : "Save register"}
        </Button>
      </div>

      <div className="mt-3 flex gap-4 text-sm text-slate-700 dark:text-slate-200">
        <span><span className="font-semibold text-green-700 dark:text-green-300">{summary.present}</span> present</span>
        <span><span className="font-semibold text-red-700 dark:text-red-400">{summary.absent}</span> absent</span>
        <span><span className="font-semibold text-slate-500 dark:text-slate-400">{summary.notRecorded}</span> not yet recorded</span>
        {savedMsg && <span className="text-indigo-600 dark:text-indigo-400">{savedMsg}</span>}
      </div>

      {absenceReports.length > 0 && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
            <CalendarOff size={15} className="shrink-0" />
            {absenceReports.length} absence{absenceReports.length === 1 ? "" : "s"} reported by parents for this date
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-300">
            {absenceReports.map((r) => (
              <li key={r.id}>
                <strong>{r.pupil.firstName} {r.pupil.lastName}</strong>
                {r.pupil.formGroup ? ` (${r.pupil.formGroup.name})` : ""} — {ABSENCE_REASON_LABELS[r.reason] ?? r.reason}
                {r.note ? `: ${r.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="p-4">Pupil</th>
              <th className="p-4">Code</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {entries === null && <TableSkeleton rows={5} cols={2} />}
            {entries?.map((e) => (
              <tr key={e.pupil.id}>
                <td className="p-4 font-medium text-slate-900 dark:text-white">
                  {e.pupil.lastName}, {e.pupil.preferredName || e.pupil.firstName}
                </td>
                <td className="p-4">
                  <select
                    value={codes[e.pupil.id] ?? ""}
                    onChange={(ev) => setCodes((prev) => ({ ...prev, [e.pupil.id]: ev.target.value }))}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
                  >
                    <option value="">Not recorded</option>
                    {ATTENDANCE_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {entries?.length === 0 && (
              <tr>
                <td colSpan={2}>
                  <EmptyState
                    icon={CalendarCheck}
                    title="No pupils in this group"
                    description="Choose a different form group, date, or session to take the register."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
