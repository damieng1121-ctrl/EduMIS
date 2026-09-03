"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type Weekday = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";

const WEEKDAYS: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

type FormGroup = { id: string; name: string };
type Subject = { id: string; name: string };
type Teacher = { id: string; name: string | null; email: string };

type Slot = {
  id: string;
  dayOfWeek: Weekday;
  periodNumber: number;
  room: string | null;
  formGroup: { id: string; name: string };
  subject: { id: string; name: string };
  teacher: { id: string; name: string | null; email: string };
};

function teacherName(t: { name: string | null; email: string }) {
  return t.name ?? t.email;
}

export default function TimetablePage() {
  const { data: session } = useSession();
  const isAdmin =
    session?.user.role === "TENANT_ADMIN" || session?.user.role === "TRUST_ADMIN" || session?.user.role === "SUPER_ADMIN";

  const [formGroups, setFormGroups] = useState<FormGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [formGroupId, setFormGroupId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newFormGroupId, setNewFormGroupId] = useState("");
  const [newDay, setNewDay] = useState<Weekday>("MONDAY");
  const [newPeriod, setNewPeriod] = useState("1");
  const [newSubjectId, setNewSubjectId] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newRoom, setNewRoom] = useState("");

  function loadSlots(fg: string) {
    const query = fg ? `?formGroupId=${fg}` : "";
    fetch(`/api/timetable${query}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSlots(Array.isArray(data) ? data : []))
      .catch(() => setSlots([]));
  }

  useEffect(() => {
    fetch("/api/form-groups")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFormGroups(Array.isArray(data) ? data : []))
      .catch(() => setFormGroups([]));
    fetch("/api/assessment-subjects")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSubjects(Array.isArray(data) ? data : []))
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    loadSlots(formGroupId);
  }, [formGroupId]);

  // Only admins can create slots, so only fetch the teacher list once we
  // know the form is actually reachable — a non-admin would just 403.
  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTeachers(Array.isArray(data) ? data.filter((u: Teacher & { isTeacher?: boolean }) => u.isTeacher) : []))
      .catch(() => setTeachers([]));
  }, [isAdmin]);

  async function createSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!newFormGroupId || !newSubjectId || !newTeacherId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formGroupId: newFormGroupId,
          dayOfWeek: newDay,
          periodNumber: parseInt(newPeriod, 10) || 1,
          subjectId: newSubjectId,
          teacherId: newTeacherId,
          room: newRoom || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't add that slot.");
        return;
      }
      if (data?.clashWarning) setError(data.clashWarning);
      setNewFormGroupId("");
      setNewSubjectId("");
      setNewTeacherId("");
      setNewRoom("");
      setNewPeriod("1");
      setShowForm(false);
      loadSlots(formGroupId);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteSlot(id: string) {
    await fetch(`/api/timetable/${id}`, { method: "DELETE" });
    loadSlots(formGroupId);
  }

  const maxPeriod = Math.max(6, ...(slots ?? []).map((s) => s.periodNumber));
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  function slotAt(day: Weekday, period: number) {
    return slots?.find((s) => s.dayOfWeek === day && s.periodNumber === period);
  }

  return (
    <div>
      <PageHeader
        module="timetable"
        title="Timetable"
        subtitle="The weekly lesson grid for each form group — specialist and PPA cover slots included."
        actions={
          isAdmin ? (
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "Add slot"}</Button>
          ) : undefined
        }
      />

      <div className="mt-4">
        <select
          value={formGroupId}
          onChange={(e) => setFormGroupId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All form groups</option>
          {formGroups.map((fg) => (
            <option key={fg.id} value={fg.id}>
              {fg.name}
            </option>
          ))}
        </select>
      </div>

      {showForm && isAdmin && (
        <form onSubmit={createSlot} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
          <select required value={newFormGroupId} onChange={(e) => setNewFormGroupId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Form group…</option>
            {formGroups.map((fg) => (
              <option key={fg.id} value={fg.id}>
                {fg.name}
              </option>
            ))}
          </select>
          <select value={newDay} onChange={(e) => setNewDay(e.target.value as Weekday)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                {WEEKDAY_LABELS[d]}
              </option>
            ))}
          </select>
          <input
            required
            type="number"
            min={1}
            max={20}
            value={newPeriod}
            onChange={(e) => setNewPeriod(e.target.value)}
            placeholder="Period"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select required value={newSubjectId} onChange={(e) => setNewSubjectId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select required value={newTeacherId} onChange={(e) => setNewTeacherId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Teacher…</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {teacherName(t)}
              </option>
            ))}
          </select>
          <input value={newRoom} onChange={(e) => setNewRoom(e.target.value)} placeholder="Room (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          {error && <p className="sm:col-span-3 text-sm text-amber-700">{error}</p>}
          <Button type="submit" disabled={submitting} className="sm:col-span-3">
            {submitting ? "Saving…" : "Save slot"}
          </Button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {slots === null ? (
          <p className="p-6 text-sm text-slate-600">Loading…</p>
        ) : slots.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No timetable slots yet"
            description={isAdmin ? "Add the first lesson slot above." : "Nothing has been timetabled yet."}
          />
        ) : (
          <table className="w-full min-w-[720px] table-fixed text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="w-20 p-3">Period</th>
                {WEEKDAYS.map((d) => (
                  <th key={d} className="p-3">
                    {WEEKDAY_LABELS[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.map((period) => (
                <tr key={period}>
                  <td className="p-3 align-top font-medium text-slate-700">{period}</td>
                  {WEEKDAYS.map((day) => {
                    const slot = slotAt(day, period);
                    return (
                      <td key={day} className="p-2 align-top">
                        {slot ? (
                          <div className="group relative rounded-lg border border-slate-200 bg-slate-50 p-2">
                            <p className="font-medium text-slate-900">{slot.subject.name}</p>
                            <p className="text-xs text-slate-600">{teacherName(slot.teacher)}</p>
                            {!formGroupId && <p className="text-xs text-slate-500">{slot.formGroup.name}</p>}
                            {slot.room && <p className="text-xs text-slate-500">Room {slot.room}</p>}
                            {isAdmin && (
                              <button
                                onClick={() => deleteSlot(slot.id)}
                                className="absolute right-1 top-1 hidden text-xs text-red-600 hover:underline group-hover:block"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="h-full min-h-[3rem] rounded-lg border border-dashed border-slate-200" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
