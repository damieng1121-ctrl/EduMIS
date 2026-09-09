"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bandage, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { printPage } from "@/lib/print";

type Severity = "MINOR" | "MODERATE" | "SERIOUS";

type Report = {
  id: string;
  date: string;
  time: string;
  location: string;
  description: string;
  injuryType: string | null;
  actionTaken: string;
  severity: Severity;
  parentNotified: boolean;
  pupil: { id: string; firstName: string; lastName: string };
  reportedBy: { name: string | null; email: string | null };
  firstAidGivenBy: { name: string | null; email: string | null } | null;
};

type Pupil = { id: string; firstName: string; lastName: string };
type StaffOption = { id: string; name: string | null; email: string | null };

const SEVERITY_STYLES: Record<Severity, string> = {
  MINOR: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MODERATE: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  SERIOUS: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const emptyForm = {
  pupilId: "",
  date: new Date().toISOString().slice(0, 10),
  time: new Date().toTimeString().slice(0, 5),
  location: "",
  description: "",
  injuryType: "",
  actionTaken: "",
  severity: "MINOR" as Severity,
  parentNotified: false,
  firstAidGivenById: "",
};

export default function FirstAidPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "TENANT_ADMIN" || session?.user.role === "TRUST_ADMIN" || session?.user.role === "SUPER_ADMIN";

  const [reports, setReports] = useState<Report[] | null>(null);
  const [pupils, setPupils] = useState<Pupil[] | null>(null);
  const [staff, setStaff] = useState<StaffOption[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/accidents").then((r) => (r.ok ? r.json() : [])).then(setReports);
  }
  function loadRefs() {
    fetch("/api/pupils").then((r) => (r.ok ? r.json() : [])).then(setPupils);
    fetch("/api/admin/users").then((r) => (r.ok ? r.json() : [])).then(setStaff);
  }
  useEffect(() => {
    load();
    loadRefs();
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function startEdit(r: Report) {
    setForm({
      pupilId: r.pupil.id,
      date: r.date.slice(0, 10),
      time: r.time,
      location: r.location,
      description: r.description,
      injuryType: r.injuryType ?? "",
      actionTaken: r.actionTaken,
      severity: r.severity,
      parentNotified: r.parentNotified,
      firstAidGivenById: "",
    });
    setEditingId(r.id);
    setShowForm(true);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = editingId ? `/api/accidents/${editingId}` : "/api/accidents";
      const method = editingId ? "PATCH" : "POST";
      const body: Record<string, unknown> = {
        date: form.date,
        time: form.time,
        location: form.location,
        description: form.description,
        injuryType: form.injuryType || undefined,
        actionTaken: form.actionTaken,
        severity: form.severity,
        parentNotified: form.parentNotified,
        firstAidGivenById: form.firstAidGivenById || undefined,
      };
      if (!editingId) body.pupilId = form.pupilId;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Couldn't save that report.");
        return;
      }
      setShowForm(false);
      setEditingId(null);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this first aid report? This can't be undone.")) return;
    const res = await fetch(`/api/accidents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Couldn't delete that report.");
      return;
    }
    load();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  const inputClass = "rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900";

  return (
    <div className="print:p-0">
      <PageHeader
        module="first-aid"
        title="First Aid"
        subtitle="Accident and first aid reports for pupils — location, injury, action taken, and whether a parent was notified."
        actions={
          <div className="flex gap-1.5 print:hidden">
            <Button variant="secondary" onClick={printPage}>
              <Printer size={15} className="shrink-0" />
              Print
            </Button>
            <Button variant={showForm ? "secondary" : "primary"} onClick={() => (showForm ? setShowForm(false) : startAdd())}>
              {showForm ? "Cancel" : "Log incident"}
            </Button>
          </div>
        }
      />

      {showForm && (
        <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 print:hidden dark:border-slate-700 dark:bg-slate-900">
          {!editingId && (
            <select required value={form.pupilId} onChange={(e) => set("pupilId", e.target.value)} className={`sm:col-span-2 ${inputClass}`}>
              <option value="">Select pupil…</option>
              {pupils?.map((p) => (
                <option key={p.id} value={p.id}>{p.lastName}, {p.firstName}</option>
              ))}
            </select>
          )}
          <label className="text-xs text-slate-600 dark:text-slate-400">
            Date
            <input required type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={`mt-1 w-full ${inputClass}`} />
          </label>
          <label className="text-xs text-slate-600 dark:text-slate-400">
            Time
            <input required type="time" value={form.time} onChange={(e) => set("time", e.target.value)} className={`mt-1 w-full ${inputClass}`} />
          </label>
          <input required value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Location, e.g. Playground" className={inputClass} />
          <input value={form.injuryType} onChange={(e) => set("injuryType", e.target.value)} placeholder="Injury type (optional), e.g. Grazed knee" className={inputClass} />
          <select value={form.severity} onChange={(e) => set("severity", e.target.value as Severity)} className={inputClass}>
            <option value="MINOR">Minor</option>
            <option value="MODERATE">Moderate</option>
            <option value="SERIOUS">Serious</option>
          </select>
          <select value={form.firstAidGivenById} onChange={(e) => set("firstAidGivenById", e.target.value)} className={inputClass}>
            <option value="">First aid given by (optional)</option>
            {staff?.map((s) => (
              <option key={s.id} value={s.id}>{s.name ?? s.email}</option>
            ))}
          </select>
          <textarea
            required
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What happened"
            rows={3}
            className={`sm:col-span-2 ${inputClass}`}
          />
          <textarea
            required
            value={form.actionTaken}
            onChange={(e) => set("actionTaken", e.target.value)}
            placeholder="Action taken / first aid given"
            rows={3}
            className={`sm:col-span-2 ${inputClass}`}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2 dark:text-slate-200">
            <input type="checkbox" checked={form.parentNotified} onChange={(e) => set("parentNotified", e.target.checked)} />
            Parent/guardian has been notified
          </label>
          {error && <p className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="sm:col-span-2">
            {submitting ? "Saving…" : editingId ? "Save changes" : "Log incident"}
          </Button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Pupil</th>
              <th className="p-4">Location</th>
              <th className="p-4">Injury</th>
              <th className="p-4">Severity</th>
              <th className="p-4">Parent notified</th>
              <th className="p-4 print:hidden"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {reports === null && <TableSkeleton rows={5} cols={7} />}
            {reports?.map((r) => (
              <tr key={r.id}>
                <td className="p-4 text-slate-700 dark:text-slate-200">
                  {formatDate(r.date)} <span className="text-slate-500 dark:text-slate-400">{r.time}</span>
                </td>
                <td className="p-4 font-medium text-slate-900 dark:text-white">{r.pupil.lastName}, {r.pupil.firstName}</td>
                <td className="p-4 text-slate-700 dark:text-slate-200">{r.location}</td>
                <td className="p-4 text-slate-700 dark:text-slate-200">{r.injuryType ?? "—"}</td>
                <td className="p-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[r.severity]}`}>
                    {r.severity.charAt(0) + r.severity.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="p-4">
                  {r.parentNotified ? (
                    <span className="text-green-700 dark:text-green-300">Yes</span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">Not yet</span>
                  )}
                </td>
                <td className="p-4 text-right print:hidden">
                  <div className="flex justify-end gap-1.5">
                    <Button variant="secondary" size="sm" onClick={() => startEdit(r)}>
                      Edit
                    </Button>
                    {isAdmin && (
                      <Button variant="danger" size="sm" onClick={() => remove(r.id)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {reports?.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState icon={Bandage} title="No first aid reports yet" description="Log an incident to keep a record of accidents and treatment given." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
