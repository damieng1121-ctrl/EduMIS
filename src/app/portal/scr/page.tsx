"use client";

import { Fragment, useEffect, useState } from "react";
import { ShieldAlert, Check, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";

type StaffProfile = {
  dbsCheckDate: string | null;
  dbsNumber: string | null;
  identityCheckDate: string | null;
  rightToWorkCheckDate: string | null;
  rightToWorkEvidence: string | null;
  barredListCheckDate: string | null;
  prohibitionCheckDate: string | null;
  qualificationsCheckedDate: string | null;
  referencesObtainedDate: string | null;
  overseasCheckDate: string | null;
};

type StaffMember = {
  id: string;
  name: string | null;
  email: string | null;
  isTeacher: boolean;
  staffProfile: StaffProfile | null;
};

// A staff member's own record decides which checks actually apply to them (e.g. "overseas"
// only matters if they've lived abroad) — so completeness only counts the ones we can verify
// from data already on file: identity, right to work, DBS, barred list, references, and
// prohibition (teaching staff only).
function isComplete(s: StaffMember): boolean {
  const p = s.staffProfile;
  if (!p) return false;
  const core = [p.identityCheckDate, p.rightToWorkCheckDate, p.dbsCheckDate, p.barredListCheckDate, p.referencesObtainedDate];
  if (s.isTeacher) core.push(p.prohibitionCheckDate);
  return core.every(Boolean);
}

function toDateInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}
function toIso(dateStr: string): string | undefined {
  return dateStr ? new Date(`${dateStr}T00:00:00.000Z`).toISOString() : undefined;
}
function fmt(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString("en-GB") : "";
}

function CheckCell({ date, applicable = true }: { date: string | null | undefined; applicable?: boolean }) {
  if (!applicable) return <span className="text-slate-400">—</span>;
  if (date) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <Check size={14} /> {fmt(date)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-600">
      <AlertTriangle size={14} /> Missing
    </span>
  );
}

type Draft = {
  identityCheckDate: string;
  rightToWorkCheckDate: string;
  rightToWorkEvidence: string;
  barredListCheckDate: string;
  prohibitionCheckDate: string;
  qualificationsCheckedDate: string;
  referencesObtainedDate: string;
  overseasCheckDate: string;
};

function toDraft(p: StaffProfile | null): Draft {
  return {
    identityCheckDate: toDateInput(p?.identityCheckDate),
    rightToWorkCheckDate: toDateInput(p?.rightToWorkCheckDate),
    rightToWorkEvidence: p?.rightToWorkEvidence ?? "",
    barredListCheckDate: toDateInput(p?.barredListCheckDate),
    prohibitionCheckDate: toDateInput(p?.prohibitionCheckDate),
    qualificationsCheckedDate: toDateInput(p?.qualificationsCheckedDate),
    referencesObtainedDate: toDateInput(p?.referencesObtainedDate),
    overseasCheckDate: toDateInput(p?.overseasCheckDate),
  };
}

export default function ScrPage() {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  function load() {
    fetch("/api/scr")
      .then((r) => {
        if (!r.ok) {
          setLoadError(true);
          return [];
        }
        return r.json();
      })
      .then(setStaff);
  }

  useEffect(load, []);

  function startEdit(s: StaffMember) {
    setEditingId(s.id);
    setDraft(toDraft(s.staffProfile));
  }

  async function save(userId: string) {
    if (!draft) return;
    setSaving(true);
    try {
      await fetch("/api/scr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          identityCheckDate: toIso(draft.identityCheckDate) ?? null,
          rightToWorkCheckDate: toIso(draft.rightToWorkCheckDate) ?? null,
          rightToWorkEvidence: draft.rightToWorkEvidence || null,
          barredListCheckDate: toIso(draft.barredListCheckDate) ?? null,
          prohibitionCheckDate: toIso(draft.prohibitionCheckDate) ?? null,
          qualificationsCheckedDate: toIso(draft.qualificationsCheckedDate) ?? null,
          referencesObtainedDate: toIso(draft.referencesObtainedDate) ?? null,
          overseasCheckDate: toIso(draft.overseasCheckDate) ?? null,
        }),
      });
      setEditingId(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  const completeCount = staff?.filter(isComplete).length ?? 0;

  if (loadError) {
    return (
      <div>
        <PageHeader module="scr" title="Single Central Record" />
        <p className="mt-4 text-sm text-slate-600">
          This module isn&apos;t switched on for your school — ask your EduMIS platform admin to enable it
          from Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        module="scr"
        title="Single Central Record"
        subtitle={staff ? `${completeCount} of ${staff.length} staff fully checked` : undefined}
      />

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        The record KCSIE expects for staff vetting — identity, right to work, DBS, barred list,
        references, and (for teaching staff) the prohibition check. A gap here is exactly what an
        inspector will ask about, so it&apos;s flagged rather than hidden.
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="p-4">Staff</th>
              <th className="p-4">Identity</th>
              <th className="p-4">Right to work</th>
              <th className="p-4">DBS</th>
              <th className="p-4">Barred list</th>
              <th className="p-4">Prohibition</th>
              <th className="p-4">Qualifications</th>
              <th className="p-4">References</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff === null && <TableSkeleton rows={5} cols={9} />}
            {staff?.map((s) => {
              const p = s.staffProfile;
              const editing = editingId === s.id;
              return (
                <Fragment key={s.id}>
                  <tr className="transition-colors hover:bg-slate-50">
                    <td className="p-4">
                      <p className="font-medium text-slate-900">{s.name ?? s.email}</p>
                      {isComplete(s) ? (
                        <span className="text-xs text-emerald-700">All checks complete</span>
                      ) : (
                        <span className="text-xs text-amber-600">Gaps to resolve</span>
                      )}
                    </td>
                    <td className="p-4"><CheckCell date={p?.identityCheckDate} /></td>
                    <td className="p-4"><CheckCell date={p?.rightToWorkCheckDate} /></td>
                    <td className="p-4"><CheckCell date={p?.dbsCheckDate} /></td>
                    <td className="p-4"><CheckCell date={p?.barredListCheckDate} /></td>
                    <td className="p-4"><CheckCell date={p?.prohibitionCheckDate} applicable={s.isTeacher} /></td>
                    <td className="p-4"><CheckCell date={p?.qualificationsCheckedDate} /></td>
                    <td className="p-4"><CheckCell date={p?.referencesObtainedDate} /></td>
                    <td className="p-4 text-right">
                      <Button variant="secondary" size="sm" onClick={() => (editing ? setEditingId(null) : startEdit(s))}>
                        {editing ? "Close" : "Edit"}
                      </Button>
                    </td>
                  </tr>
                  {editing && draft && (
                    <tr>
                      <td colSpan={9} className="bg-slate-50 p-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                          <label className="text-xs font-medium text-slate-600">
                            Identity check
                            <input type="date" value={draft.identityCheckDate} onChange={(e) => setDraft({ ...draft, identityCheckDate: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                          </label>
                          <label className="text-xs font-medium text-slate-600">
                            Right to work check
                            <input type="date" value={draft.rightToWorkCheckDate} onChange={(e) => setDraft({ ...draft, rightToWorkCheckDate: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                          </label>
                          <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                            Right to work evidence
                            <input value={draft.rightToWorkEvidence} onChange={(e) => setDraft({ ...draft, rightToWorkEvidence: e.target.value })} placeholder="e.g. British passport" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                          </label>
                          <label className="text-xs font-medium text-slate-600">
                            Barred list check
                            <input type="date" value={draft.barredListCheckDate} onChange={(e) => setDraft({ ...draft, barredListCheckDate: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                          </label>
                          {s.isTeacher && (
                            <label className="text-xs font-medium text-slate-600">
                              Prohibition check
                              <input type="date" value={draft.prohibitionCheckDate} onChange={(e) => setDraft({ ...draft, prohibitionCheckDate: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                            </label>
                          )}
                          <label className="text-xs font-medium text-slate-600">
                            Qualifications checked
                            <input type="date" value={draft.qualificationsCheckedDate} onChange={(e) => setDraft({ ...draft, qualificationsCheckedDate: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                          </label>
                          <label className="text-xs font-medium text-slate-600">
                            References obtained
                            <input type="date" value={draft.referencesObtainedDate} onChange={(e) => setDraft({ ...draft, referencesObtainedDate: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                          </label>
                          <label className="text-xs font-medium text-slate-600">
                            Overseas check (if applicable)
                            <input type="date" value={draft.overseasCheckDate} onChange={(e) => setDraft({ ...draft, overseasCheckDate: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                          </label>
                        </div>
                        <p className="mt-2 text-xs text-slate-600">DBS check date/number are set on the Staff records page.</p>
                        <div className="mt-4">
                          <Button size="sm" onClick={() => save(s.id)} disabled={saving}>
                            {saving ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {staff?.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState icon={ShieldAlert} title="No staff yet" description="Staff will appear here once they're added to your school." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
