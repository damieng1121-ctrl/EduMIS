"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { isAdmin } from "@/lib/roles";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { UserX, Sprout } from "lucide-react";

type Readiness = {
  totalPupils: number;
  pupilsWithIssues: number;
  issuesByField: Record<string, number>;
  pupils: { id: string; name: string; yearGroup: string; missingFields: string[] }[];
};

const FIELD_LABELS: Record<string, string> = {
  upn: "UPN",
  dob: "Date of birth",
  gender: "Gender",
  ethnicity: "Ethnicity",
  postcode: "Postcode",
  admissionDate: "Admission date",
};

export default function CensusPage() {
  const { data: session, status } = useSession();
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  useEffect(() => {
    if (!session?.user || !isAdmin(session.user.role)) return;
    fetch("/api/census/readiness")
      .then((r) => (r.ok ? r.json() : null))
      .then(setReadiness);
  }, [session]);

  if (status === "loading") return <p className="text-sm text-slate-700">Loading…</p>;

  if (!session?.user || !isAdmin(session.user.role)) {
    return <p className="text-sm text-slate-700">This area is only available to school admins.</p>;
  }

  return (
    <div>
      <PageHeader
        module="census"
        title="Census readiness"
        actions={
          <a
            href="/api/census/export"
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
          >
            Download CSV export
          </a>
        }
      />

      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        This is a data-readiness and export tool, not an official DfE school census submission. It helps you find
        missing or malformed pupil data and gives you a CSV starting point — your school still completes and
        submits its actual census return through DfE&apos;s COLLECT system.
      </div>

      {!readiness ? (
        <p className="mt-6 text-sm text-slate-700">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Active pupils" value={readiness.totalPupils} />
            <Stat
              label="Pupils with issues"
              value={readiness.pupilsWithIssues}
              highlight={readiness.pupilsWithIssues > 0}
            />
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Issues by field</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {Object.entries(readiness.issuesByField).map(([field, count]) => (
                <li key={field} className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-600">{FIELD_LABELS[field] ?? field}</span>
                  <span className={count > 0 ? "font-medium text-red-600" : "text-slate-700"}>{count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Pupils with missing data</h2>
            {readiness.pupils.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">No issues found — every active pupil has these fields set.</p>
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="pb-2 font-medium">Pupil</th>
                    <th className="pb-2 font-medium">Year group</th>
                    <th className="pb-2 font-medium">Missing fields</th>
                  </tr>
                </thead>
                <tbody>
                  {readiness.pupils.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="py-2">
                        <Link href={`/portal/pupils/${p.id}`} className="text-indigo-700 hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-2 text-slate-700">{p.yearGroup.replace("YEAR_", "Year ").replace("_", " ")}</td>
                      <td className="py-2 text-slate-700">
                        {p.missingFields.map((f) => FIELD_LABELS[f] ?? f).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <ExclusionsSection />
          <EyfsProfileSection />
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-700">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${highlight ? "text-red-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function formatYearGroup(yearGroup: string) {
  return yearGroup.replace("YEAR_", "Year ").replace("_", " ");
}

// ---------- Exclusions ----------

type ExclusionType = "FIXED_TERM" | "PERMANENT";

type Exclusion = {
  id: string;
  type: ExclusionType;
  startDate: string;
  endDate: string | null;
  sessionsLost: number | null;
  reason: string;
  pupil: { firstName: string; lastName: string; yearGroup: string };
};

type PupilOption = { id: string; firstName: string; lastName: string };

const EXCLUSION_TYPE_LABELS: Record<ExclusionType, string> = {
  FIXED_TERM: "Fixed-term",
  PERMANENT: "Permanent",
};

const EXCLUSION_TYPE_STYLES: Record<ExclusionType, string> = {
  FIXED_TERM: "bg-amber-100 text-amber-700",
  PERMANENT: "bg-red-100 text-red-700",
};

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("en-GB") : "—";
}

/** Sept 1 – Aug 31 bounds for the academic year containing `now` (UK school-year convention). */
function currentAcademicYearBounds(now = new Date()) {
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    start: new Date(startYear, 8, 1),
    label: `${startYear}/${String(startYear + 1).slice(2)}`,
  };
}

function ExclusionsSection() {
  const [exclusions, setExclusions] = useState<Exclusion[] | null>(null);
  const [pupils, setPupils] = useState<PupilOption[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [pupilId, setPupilId] = useState("");
  const [type, setType] = useState<ExclusionType>("FIXED_TERM");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [sessionsLost, setSessionsLost] = useState("");
  const [reason, setReason] = useState("");

  function load() {
    fetch("/api/exclusions")
      .then((r) => {
        if (r.status === 403) setDisabled(true);
        return r.ok ? r.json() : [];
      })
      .then(setExclusions);
    fetch("/api/pupils")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPupils(Array.isArray(data) ? data : []));
  }
  useEffect(load, []);

  async function createExclusion(e: React.FormEvent) {
    e.preventDefault();
    if (!pupilId || !reason) return;
    setSubmitting(true);
    try {
      await fetch("/api/exclusions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pupilId,
          type,
          startDate,
          endDate: type === "FIXED_TERM" && endDate ? endDate : undefined,
          sessionsLost: sessionsLost ? parseInt(sessionsLost, 10) : undefined,
          reason,
        }),
      });
      setPupilId("");
      setType("FIXED_TERM");
      setEndDate("");
      setSessionsLost("");
      setReason("");
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  const { start, label } = currentAcademicYearBounds();
  const thisYear = exclusions?.filter((x) => new Date(x.startDate) >= start) ?? [];

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Exclusions</h2>
          <p className="text-sm text-slate-600">Suspensions and permanent exclusions for the {label} academic year.</p>
        </div>
        {!disabled && (
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Add exclusion"}
          </Button>
        )}
      </div>

      {disabled ? (
        <p className="mt-4 text-sm text-slate-600">Extended census isn&apos;t switched on for your school.</p>
      ) : (
        <>
          {showForm && (
            <form
              onSubmit={createExclusion}
              className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"
            >
              <select
                required
                value={pupilId}
                onChange={(e) => setPupilId(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select pupil…</option>
                {pupils.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ExclusionType)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="FIXED_TERM">Fixed-term</option>
                <option value="PERMANENT">Permanent</option>
              </select>
              <label className="flex flex-col gap-1 text-xs text-slate-600">
                Start date
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              {type === "FIXED_TERM" && (
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  End date
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              )}
              <label className="flex flex-col gap-1 text-xs text-slate-600">
                Sessions lost
                <input
                  type="number"
                  min={0}
                  value={sessionsLost}
                  onChange={(e) => setSessionsLost(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason"
                rows={2}
                className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <Button type="submit" size="sm" disabled={submitting} className="sm:col-span-2">
                {submitting ? "Saving…" : "Save exclusion"}
              </Button>
            </form>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="p-2">Pupil</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Start</th>
                  <th className="p-2">End</th>
                  <th className="p-2">Sessions lost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exclusions === null && <TableSkeleton rows={3} cols={5} />}
                {exclusions !== null && thisYear.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={UserX}
                        title="No exclusions recorded"
                        description="Fixed-term and permanent exclusions logged for this academic year will appear here."
                      />
                    </td>
                  </tr>
                )}
                {thisYear.map((x) => (
                  <tr key={x.id}>
                    <td className="p-2 font-medium text-slate-900">
                      {x.pupil.firstName} {x.pupil.lastName}
                      <span className="ml-1 text-xs font-normal text-slate-500">{formatYearGroup(x.pupil.yearGroup)}</span>
                    </td>
                    <td className="p-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${EXCLUSION_TYPE_STYLES[x.type]}`}>
                        {EXCLUSION_TYPE_LABELS[x.type]}
                      </span>
                    </td>
                    <td className="p-2 text-slate-700">{fmtDate(x.startDate)}</td>
                    <td className="p-2 text-slate-700">{fmtDate(x.endDate)}</td>
                    <td className="p-2 text-slate-700">{x.sessionsLost ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- EYFS Profile ----------

type ElgScore = "emerging" | "expected" | "exceeding";

type EyfsPupil = {
  id: string;
  firstName: string;
  lastName: string;
  eyfsProfileData: Record<string, ElgScore> | null;
};

const ELG_FIELDS: [string, string][] = [
  ["listeningAttention", "Listening, Attention and Understanding"],
  ["speaking", "Speaking"],
  ["selfRegulation", "Self-Regulation"],
  ["managingSelf", "Managing Self"],
  ["buildingRelationships", "Building Relationships"],
  ["grossMotor", "Gross Motor Skills"],
  ["fineMotor", "Fine Motor Skills"],
  ["comprehension", "Comprehension"],
  ["wordReading", "Word Reading"],
  ["writing", "Writing"],
  ["number", "Number"],
  ["numericalPatterns", "Numerical Patterns"],
  ["pastPresent", "Past and Present"],
  ["peopleCultureCommunities", "People, Culture and Communities"],
  ["naturalWorld", "The Natural World"],
  ["creatingMaterials", "Creating with Materials"],
  ["beingImaginative", "Being Imaginative and Expressive"],
];

function elgCompletionLabel(data: Record<string, ElgScore> | null) {
  const count = ELG_FIELDS.filter(([key]) => data?.[key]).length;
  if (count === 0) return "Not started";
  if (count === ELG_FIELDS.length) return `${count}/${ELG_FIELDS.length} ELGs · Complete`;
  return `${count}/${ELG_FIELDS.length} ELGs · Partial`;
}

function EyfsEditor({ pupil, onSaved }: { pupil: EyfsPupil; onSaved: () => void }) {
  const [scores, setScores] = useState<Record<string, ElgScore | "">>(() => {
    const initial: Record<string, ElgScore | ""> = {};
    for (const [key] of ELG_FIELDS) initial[key] = pupil.eyfsProfileData?.[key] ?? "";
    return initial;
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const data: Record<string, ElgScore> = {};
      for (const [key, value] of Object.entries(scores)) {
        if (value) data[key] = value as ElgScore;
      }
      await fetch("/api/eyfs-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pupilId: pupil.id, data }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
      {ELG_FIELDS.map(([key, label]) => (
        <label key={key} className="flex flex-col gap-1 text-xs text-slate-600">
          {label}
          <select
            value={scores[key]}
            onChange={(e) => setScores((s) => ({ ...s, [key]: e.target.value as ElgScore | "" }))}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Not yet assessed</option>
            <option value="emerging">Emerging</option>
            <option value="expected">Expected</option>
            <option value="exceeding">Exceeding</option>
          </select>
        </label>
      ))}
      <Button size="sm" onClick={save} disabled={saving} className="sm:col-span-2">
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </div>
  );
}

function EyfsProfileSection() {
  const [pupils, setPupils] = useState<EyfsPupil[] | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function load() {
    fetch("/api/eyfs-profile")
      .then((r) => {
        if (r.status === 403) setDisabled(true);
        return r.ok ? r.json() : [];
      })
      .then(setPupils);
  }
  useEffect(load, []);

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">EYFS Profile</h2>
      <p className="text-sm text-slate-600">Reception-year early learning goal (ELG) outcomes.</p>

      {disabled ? (
        <p className="mt-4 text-sm text-slate-600">Extended census isn&apos;t switched on for your school.</p>
      ) : pupils === null ? (
        <table className="mt-4 w-full text-left text-sm">
          <tbody className="divide-y divide-slate-100">
            <TableSkeleton rows={3} cols={2} />
          </tbody>
        </table>
      ) : pupils.length === 0 ? (
        <EmptyState icon={Sprout} title="No Reception pupils" description="Pupils in Reception year will appear here once added." />
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {pupils.map((p) => (
            <li key={p.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="text-xs text-slate-600">{elgCompletionLabel(p.eyfsProfileData)}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setEditingId(editingId === p.id ? null : p.id)}>
                  {editingId === p.id ? "Close" : "Edit"}
                </Button>
              </div>
              {editingId === p.id && (
                <EyfsEditor
                  pupil={p}
                  onSaved={() => {
                    setEditingId(null);
                    load();
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
