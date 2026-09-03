"use client";

import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";

type Teacher = { id: string; name: string | null; email: string; isTeacher: boolean };

type CoverStatus = "NEEDS_COVER" | "ASSIGNED" | "COMPLETED";

type CoverAssignment = {
  id: string;
  date: string;
  status: CoverStatus;
  notes: string | null;
  timetableSlot: {
    dayOfWeek: string;
    periodNumber: number;
    room: string | null;
    formGroup: { id: string; name: string };
    subject: { id: string; name: string };
  };
  absentTeacher: { id: string; name: string | null; email: string };
  coveringTeacher: { id: string; name: string | null; email: string } | null;
};

const STATUS_STYLES: Record<CoverStatus, string> = {
  NEEDS_COVER: "bg-red-100 text-red-700",
  ASSIGNED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
};

function personName(p: { name: string | null; email: string }) {
  return p.name ?? p.email;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function CoverAdminPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<CoverAssignment[] | null>(null);
  const [date, setDate] = useState(todayIso);

  const [absentTeacherId, setAbsentTeacherId] = useState("");
  const [absentDate, setAbsentDate] = useState(todayIso);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadAssignments(d: string) {
    const query = d ? `?date=${d}` : "";
    fetch(`/api/cover${query}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAssignments(Array.isArray(data) ? data : []))
      .catch(() => setAssignments([]));
  }

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTeachers(Array.isArray(data) ? data.filter((u: Teacher) => u.isTeacher) : []))
      .catch(() => setTeachers([]));
  }, []);

  useEffect(() => {
    loadAssignments(date);
  }, [date]);

  async function markAbsent(e: React.FormEvent) {
    e.preventDefault();
    if (!absentTeacherId) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ absentTeacherId, date: absentDate, notes: notes || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't generate cover needs.");
        return;
      }
      const createdCount = data?.created?.length ?? 0;
      const skipped = data?.skipped ?? 0;
      setMessage(
        createdCount === 0 && skipped === 0
          ? "That teacher has no lessons timetabled on that day."
          : `Raised ${createdCount} cover need${createdCount === 1 ? "" : "s"}${skipped ? ` (${skipped} already existed)` : ""}.`,
      );
      setNotes("");
      setDate(absentDate);
      loadAssignments(absentDate);
    } finally {
      setSubmitting(false);
    }
  }

  async function assignCoveringTeacher(id: string, coveringTeacherId: string) {
    await fetch(`/api/cover/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coveringTeacherId: coveringTeacherId || null }),
    });
    loadAssignments(date);
  }

  async function setStatus(id: string, status: CoverStatus) {
    await fetch(`/api/cover/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadAssignments(date);
  }

  return (
    <div>
      <PageHeader
        module="cover"
        title="Cover management"
        subtitle="Mark a teacher absent for a day to raise cover needs for every lesson they'd normally teach, then assign who's covering."
      />

      <form onSubmit={markAbsent} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <select required value={absentTeacherId} onChange={(e) => setAbsentTeacherId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">Staff member…</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {personName(t)}
            </option>
          ))}
        </select>
        <input required type="date" value={absentDate} onChange={(e) => setAbsentDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <Button type="submit" disabled={submitting}>
          {submitting ? "Marking absent…" : "Mark absent"}
        </Button>
        {message && <p className="sm:col-span-4 text-sm text-green-700">{message}</p>}
        {error && <p className="sm:col-span-4 text-sm text-red-600">{error}</p>}
      </form>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Cover assignments</p>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="p-4">Lesson</th>
              <th className="p-4">Absent teacher</th>
              <th className="p-4">Covering teacher</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assignments === null && <TableSkeleton rows={5} cols={5} />}
            {assignments?.map((a) => (
              <tr key={a.id}>
                <td className="p-4">
                  <p className="font-medium text-slate-900">
                    {a.timetableSlot.subject.name} — {a.timetableSlot.formGroup.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Period {a.timetableSlot.periodNumber}
                    {a.timetableSlot.room ? ` · Room ${a.timetableSlot.room}` : ""}
                  </p>
                </td>
                <td className="p-4 text-slate-600">{personName(a.absentTeacher)}</td>
                <td className="p-4">
                  <select
                    value={a.coveringTeacher?.id ?? ""}
                    onChange={(e) => assignCoveringTeacher(a.id, e.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {teachers
                      .filter((t) => t.id !== a.absentTeacher.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {personName(t)}
                        </option>
                      ))}
                  </select>
                </td>
                <td className="p-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status]}`}>
                    {a.status.replace("_", " ")}
                  </span>
                </td>
                <td className="p-4">
                  {a.status === "ASSIGNED" && (
                    <Button variant="ghost" onClick={() => setStatus(a.id, "COMPLETED")} className="text-xs">
                      Mark completed
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {assignments?.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState icon={UserCog} title="No cover needed" description="No cover assignments for this date yet." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
