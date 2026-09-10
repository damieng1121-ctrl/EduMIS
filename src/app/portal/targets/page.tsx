"use client";

import { useEffect, useState } from "react";
import { Target as TargetIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type Status = "NOT_STARTED" | "IN_PROGRESS" | "ACHIEVED";

type Subject = { id: string; name: string };
type Pupil = { id: string; firstName: string; lastName: string };
type Target = {
  id: string;
  pupilId: string;
  subjectId: string | null;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: Status;
  pupil: { firstName: string; lastName: string };
  subject: { name: string } | null;
  createdBy: { name: string | null; email: string | null };
};

const COLUMNS: { status: Status; label: string }[] = [
  { status: "NOT_STARTED", label: "Not started" },
  { status: "IN_PROGRESS", label: "In progress" },
  { status: "ACHIEVED", label: "Achieved" },
];

export default function TargetsPage() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [pupils, setPupils] = useState<Pupil[] | null>(null);
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [filterPupilId, setFilterPupilId] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [pupilId, setPupilId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function loadReference() {
    fetch("/api/assessment-subjects").then((r) => (r.ok ? r.json() : [])).then(setSubjects);
    fetch("/api/pupils").then((r) => (r.ok ? r.json() : [])).then(setPupils);
  }

  function loadTargets() {
    const params = new URLSearchParams();
    if (filterPupilId) params.set("pupilId", filterPupilId);
    fetch(`/api/targets?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setTargets);
  }

  useEffect(loadReference, []);
  useEffect(loadTargets, [filterPupilId]);

  async function createTarget(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pupilId,
          subjectId: subjectId || undefined,
          title,
          description: description || undefined,
          targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
        }),
      });
      setTitle("");
      setDescription("");
      setTargetDate("");
      setSubjectId("");
      setShowForm(false);
      loadTargets();
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: string, status: Status) {
    await fetch(`/api/targets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadTargets();
  }

  async function saveTarget(id: string, patch: Partial<Pick<Target, "title" | "description" | "targetDate" | "status">>) {
    await fetch(`/api/targets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    loadTargets();
  }

  async function deleteTarget(t: Target) {
    if (!window.confirm(`Delete the target "${t.title}"? This can't be undone.`)) return;
    await fetch(`/api/targets/${t.id}`, { method: "DELETE" });
    loadTargets();
  }

  return (
    <div>
      <PageHeader
        module="targets"
        title="Pupil targets"
        actions={
          <Button variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "New target"}
          </Button>
        }
      />

      {showForm && (
        <form onSubmit={createTarget} className="mt-4 grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-5 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900">
          <select required value={pupilId} onChange={(e) => setPupilId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">
            <option value="">Pupil…</option>
            {pupils?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">
            <option value="">Subject (optional)</option>
            {subjects?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Target title" className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600" />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
            rows={2}
          />
          <label className="text-xs font-medium text-slate-700 dark:text-slate-200">
            Target date
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600" />
          </label>
          <Button type="submit" disabled={submitting} className="sm:col-span-2">
            {submitting ? "Saving…" : "Save target"}
          </Button>
        </form>
      )}

      <div className="mt-4">
        <select value={filterPupilId} onChange={(e) => setFilterPupilId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">
          <option value="">All pupils</option>
          {pupils?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <div key={col.status} className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {col.label} <span className="text-slate-500 dark:text-slate-400">({targets?.filter((t) => t.status === col.status).length ?? 0})</span>
            </h2>
            <div className="mt-3 space-y-3">
              {targets
                ?.filter((t) => t.status === col.status)
                .map((t) => (
                  <TargetCard
                    key={t.id}
                    target={t}
                    onSetStatus={(status) => setStatus(t.id, status)}
                    onSave={(patch) => saveTarget(t.id, patch)}
                    onDelete={() => deleteTarget(t)}
                  />
                ))}
              {targets?.filter((t) => t.status === col.status).length === 0 && (
                <EmptyState icon={TargetIcon} title="Nothing here yet" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TargetCard({
  target,
  onSetStatus,
  onSave,
  onDelete,
}: {
  target: Target;
  onSetStatus: (status: Status) => void;
  onSave: (patch: Partial<Pick<Target, "title" | "description" | "targetDate" | "status">>) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(target.title);
  const [description, setDescription] = useState(target.description ?? "");
  const [targetDate, setTargetDate] = useState(target.targetDate ? target.targetDate.slice(0, 10) : "");
  const [status, setLocalStatus] = useState<Status>(target.status);
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    try {
      await onSave({
        title,
        description: description || null,
        targetDate: targetDate ? new Date(targetDate).toISOString() : null,
        status,
      });
      setEditing(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Target title" className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600" />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
          rows={2}
        />
        <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600" />
        <select value={status} onChange={(e) => setLocalStatus(e.target.value as Status)} className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600">
          {COLUMNS.map((c) => (
            <option key={c.status} value={c.status}>
              {c.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={submitting || !title}>
            {submitting ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{target.title}</p>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" onClick={() => setEditing(true)} className="text-xs">
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        {target.pupil.firstName} {target.pupil.lastName}
        {target.subject ? ` · ${target.subject.name}` : ""}
      </p>
      {target.description && <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">{target.description}</p>}
      {target.targetDate && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Due {new Date(target.targetDate).toLocaleDateString("en-GB")}</p>}
      <select
        value={target.status}
        onChange={(e) => onSetStatus(e.target.value as Status)}
        className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
      >
        {COLUMNS.map((c) => (
          <option key={c.status} value={c.status}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}
