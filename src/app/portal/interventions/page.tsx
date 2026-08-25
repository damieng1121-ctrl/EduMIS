"use client";

import { Fragment, useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";

type Pupil = { id: string; firstName: string; lastName: string };
type InterventionStatus = "PLANNED" | "ACTIVE" | "COMPLETED";

type Note = {
  id: string;
  note: string;
  createdAt: string;
  author: { name: string | null; email: string | null };
};

type Intervention = {
  id: string;
  title: string;
  subjectArea: string | null;
  groupSize: number | null;
  startDate: string;
  endDate: string | null;
  targetOutcome: string;
  status: InterventionStatus;
  pupil: { firstName: string; lastName: string };
  provider: { name: string | null; email: string | null };
  notes: Note[];
};

const STATUS_STYLES: Record<InterventionStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
};

function pupilName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB");
}

export default function InterventionsPage() {
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [interventions, setInterventions] = useState<Intervention[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pupilId, setPupilId] = useState("");
  const [title, setTitle] = useState("");
  const [subjectArea, setSubjectArea] = useState("");
  const [groupSize, setGroupSize] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [targetOutcome, setTargetOutcome] = useState("");

  function load() {
    fetch("/api/interventions")
      .then((r) => (r.ok ? r.json() : []))
      .then(setInterventions);
    fetch("/api/pupils")
      .then((r) => r.json())
      .then((data) => setPupils(Array.isArray(data) ? data : []))
      .catch(() => setPupils([]));
  }
  useEffect(load, []);

  async function createIntervention(e: React.FormEvent) {
    e.preventDefault();
    if (!pupilId) return;
    setSubmitting(true);
    try {
      await fetch("/api/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pupilId,
          title,
          subjectArea: subjectArea || undefined,
          groupSize: groupSize ? parseInt(groupSize, 10) : undefined,
          startDate,
          endDate: endDate || undefined,
          targetOutcome,
        }),
      });
      setPupilId("");
      setTitle("");
      setSubjectArea("");
      setGroupSize("");
      setEndDate("");
      setTargetOutcome("");
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id: string, status: InterventionStatus) {
    await fetch(`/api/interventions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div>
      <PageHeader
        module="interventions"
        title="Interventions"
        subtitle={interventions ? `${interventions.length} interventions` : undefined}
        actions={
          <Button variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "New intervention"}
          </Button>
        }
      />

      {showForm && (
        <form onSubmit={createIntervention} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <select required value={pupilId} onChange={(e) => setPupilId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select pupil…</option>
            {pupils.map((p) => (
              <option key={p.id} value={p.id}>
                {pupilName(p)}
              </option>
            ))}
          </select>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input value={subjectArea} onChange={(e) => setSubjectArea(e.target.value)} placeholder="Subject area (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" min="1" value={groupSize} onChange={(e) => setGroupSize(e.target.value)} placeholder="Group size (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-1/2 rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="End date" className="w-1/2 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <textarea required value={targetOutcome} onChange={(e) => setTargetOutcome(e.target.value)} placeholder="Target outcome" className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm" rows={2} />
          <Button type="submit" disabled={submitting} className="sm:col-span-2">
            {submitting ? "Saving…" : "Save intervention"}
          </Button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="p-4">Pupil</th>
              <th className="p-4">Title</th>
              <th className="p-4">Dates</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {interventions === null && <TableSkeleton rows={5} cols={5} />}
            {interventions?.map((i) => {
              const expanded = expandedId === i.id;
              return (
                <Fragment key={i.id}>
                  <tr>
                    <td className="p-4 font-medium text-slate-900">{pupilName(i.pupil)}</td>
                    <td className="p-4 text-slate-600">
                      <p>{i.title}</p>
                      {i.subjectArea && <p className="text-xs text-slate-500">{i.subjectArea}</p>}
                    </td>
                    <td className="p-4 text-slate-600">
                      {fmtDate(i.startDate)}
                      {i.endDate ? ` – ${fmtDate(i.endDate)}` : ""}
                    </td>
                    <td className="p-4">
                      <select
                        value={i.status}
                        onChange={(e) => updateStatus(i.id, e.target.value as InterventionStatus)}
                        className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[i.status]}`}
                      >
                        <option value="PLANNED">PLANNED</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" onClick={() => setExpandedId(expanded ? null : i.id)} className="text-xs">
                        {expanded ? "Collapse" : `Notes (${i.notes.length})`}
                      </Button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50 p-4">
                        <InterventionDetail intervention={i} onChanged={load} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {interventions?.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState icon={TrendingUp} title="No interventions yet" description="Interventions you start will appear here." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InterventionDetail({ intervention, onChanged }: { intervention: Intervention; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/interventions/${intervention.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      setNote("");
      onChanged();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-slate-700">
        <span className="font-medium text-slate-900">Target outcome: </span>
        {intervention.targetOutcome}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Provider: {intervention.provider.name ?? intervention.provider.email}
        {intervention.groupSize ? ` · Group size ${intervention.groupSize}` : ""}
      </p>

      <div className="mt-3 space-y-2">
        {intervention.notes.map((n) => (
          <div key={n.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
            <p className="text-slate-700">{n.note}</p>
            <p className="mt-1 text-xs text-slate-400">
              {n.author.name ?? n.author.email} · {new Date(n.createdAt).toLocaleString("en-GB")}
            </p>
          </div>
        ))}
        {intervention.notes.length === 0 && <p className="text-xs text-slate-500">No notes yet.</p>}
      </div>

      <form onSubmit={addNote} className="mt-3 flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={submitting}>
          Add
        </Button>
      </form>
    </div>
  );
}
