"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { HeartHandshake, AlertTriangle, Star, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";

type Pupil = { id: string; firstName: string; lastName: string };
type FormGroup = { id: string; name: string; yearGroup: YearGroup };

type YearGroup =
  | "NURSERY" | "RECEPTION" | "YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4" | "YEAR_5"
  | "YEAR_6" | "YEAR_7" | "YEAR_8" | "YEAR_9" | "YEAR_10" | "YEAR_11" | "YEAR_12" | "YEAR_13";

const YEAR_GROUP_LABELS: Record<YearGroup, string> = {
  NURSERY: "Nursery", RECEPTION: "Reception", YEAR_1: "Year 1", YEAR_2: "Year 2", YEAR_3: "Year 3",
  YEAR_4: "Year 4", YEAR_5: "Year 5", YEAR_6: "Year 6", YEAR_7: "Year 7", YEAR_8: "Year 8",
  YEAR_9: "Year 9", YEAR_10: "Year 10", YEAR_11: "Year 11", YEAR_12: "Year 12", YEAR_13: "Year 13",
};

type PointsCategory = "ACHIEVEMENT" | "EFFORT" | "KINDNESS" | "ATTENDANCE" | "CONDUCT" | "OTHER";

type PointsEntry = {
  id: string;
  date: string;
  points: number;
  category: PointsCategory;
  reason: string;
  pupil: { firstName: string; lastName: string };
  awardedBy: { name: string | null; email: string | null };
};

type LeaderboardRow = {
  pupilId: string;
  firstName: string;
  lastName: string;
  yearGroup: YearGroup;
  formGroup: { id: string; name: string } | null;
  totalPoints: number;
  entryCount: number;
};

type DetentionStatus = "SCHEDULED" | "ATTENDED" | "MISSED";

type Detention = {
  id: string;
  date: string;
  reason: string;
  location: string | null;
  status: DetentionStatus;
  pupil: { firstName: string; lastName: string };
  scheduledBy: { name: string | null; email: string | null };
};

type BehaviourCategory = "ACHIEVEMENT" | "CONCERN" | "BULLYING" | "SAFEGUARDING";

type Incident = {
  id: string;
  date: string;
  category: BehaviourCategory;
  points: number;
  description: string;
  location: string | null;
  actionTaken: string | null;
  followUpRequired: boolean;
  followUpNotes: string | null;
  isConfidential: boolean;
  pupil: { firstName: string; lastName: string };
  recordedBy: { name: string | null; email: string | null };
};

type AccidentSeverity = "MINOR" | "MODERATE" | "SERIOUS";

type Accident = {
  id: string;
  date: string;
  time: string;
  location: string;
  description: string;
  injuryType: string | null;
  actionTaken: string;
  severity: AccidentSeverity;
  parentNotified: boolean;
  parentNotifiedAt: string | null;
  pupil: { firstName: string; lastName: string };
  reportedBy: { name: string | null; email: string | null };
};

const CATEGORY_STYLES: Record<BehaviourCategory, string> = {
  ACHIEVEMENT: "bg-green-100 text-green-700",
  CONCERN: "bg-amber-100 text-amber-700",
  BULLYING: "bg-red-100 text-red-700",
  SAFEGUARDING: "bg-red-100 text-red-700",
};

const SEVERITY_STYLES: Record<AccidentSeverity, string> = {
  MINOR: "bg-slate-100 text-slate-600",
  MODERATE: "bg-amber-100 text-amber-700",
  SERIOUS: "bg-red-100 text-red-700",
};

const POINTS_CATEGORY_LABELS: Record<PointsCategory, string> = {
  ACHIEVEMENT: "Achievement",
  EFFORT: "Effort",
  KINDNESS: "Kindness",
  ATTENDANCE: "Attendance",
  CONDUCT: "Conduct",
  OTHER: "Other",
};

const DETENTION_STATUS_STYLES: Record<DetentionStatus, string> = {
  SCHEDULED: "bg-amber-100 text-amber-700",
  ATTENDED: "bg-green-100 text-green-700",
  MISSED: "bg-red-100 text-red-700",
};

function pupilName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB");
}

const TABS = ["incidents", "points", "detentions", "accidents"] as const;
const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  incidents: "Incidents",
  points: "Points",
  detentions: "Detentions",
  accidents: "Accidents",
};

export default function BehaviourPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("incidents");

  return (
    <div>
      <PageHeader module="behaviour" title="Behaviour & wellbeing" />
      <div className="mt-4 flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "incidents" && <IncidentsTab />}
        {tab === "points" && <PointsTab />}
        {tab === "detentions" && <DetentionsTab />}
        {tab === "accidents" && <AccidentsTab />}
      </div>
    </div>
  );
}

function IncidentsTab() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "TENANT_ADMIN" || session?.user.role === "TRUST_ADMIN" || session?.user.role === "SUPER_ADMIN";

  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [pupilId, setPupilId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<BehaviourCategory>("CONCERN");
  const [points, setPoints] = useState("0");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState("");

  function load() {
    fetch("/api/behaviour")
      .then((r) => (r.ok ? r.json() : []))
      .then(setIncidents);
    fetch("/api/pupils")
      .then((r) => r.json())
      .then((data) => setPupils(Array.isArray(data) ? data : []))
      .catch(() => setPupils([]));
  }
  useEffect(load, []);

  async function createIncident(e: React.FormEvent) {
    e.preventDefault();
    if (!pupilId) return;
    setSubmitting(true);
    try {
      await fetch("/api/behaviour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pupilId,
          date,
          category,
          points: parseInt(points, 10) || 0,
          description,
          location: location || undefined,
          actionTaken: actionTaken || undefined,
          followUpRequired,
          followUpNotes: followUpNotes || undefined,
        }),
      });
      setPupilId("");
      setDescription("");
      setLocation("");
      setActionTaken("");
      setFollowUpRequired(false);
      setFollowUpNotes("");
      setPoints("0");
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-700">{incidents ? `${incidents.length} incidents` : ""}</p>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Log incident"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={createIncident} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <select required value={pupilId} onChange={(e) => setPupilId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select pupil…</option>
            {pupils.map((p) => (
              <option key={p.id} value={p.id}>
                {pupilName(p)}
              </option>
            ))}
          </select>
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={category} onChange={(e) => setCategory(e.target.value as BehaviourCategory)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="ACHIEVEMENT">Achievement</option>
            <option value="CONCERN">Concern</option>
            <option value="BULLYING">Bullying</option>
            <option value="SAFEGUARDING">Safeguarding</option>
          </select>
          <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="Points" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} placeholder="Action taken" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={followUpRequired} onChange={(e) => setFollowUpRequired(e.target.checked)} />
            Follow-up required
          </label>
          {followUpRequired && (
            <input value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} placeholder="Follow-up notes" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          )}
          {(category === "SAFEGUARDING" || category === "BULLYING") && (
            <p className="sm:col-span-2 text-xs text-red-700">This incident will be marked confidential automatically and hidden from non-admin staff.</p>
          )}
          <Button type="submit" disabled={submitting} className="sm:col-span-2">
            {submitting ? "Saving…" : "Save incident"}
          </Button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="p-4">Pupil</th>
              <th className="p-4">Date</th>
              <th className="p-4">Category</th>
              <th className="p-4">Points</th>
              <th className="p-4">Description</th>
              <th className="p-4">Recorded by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {incidents === null && <TableSkeleton rows={5} cols={6} />}
            {incidents?.map((i) => (
              <tr key={i.id}>
                <td className="p-4 font-medium text-slate-900">{pupilName(i.pupil)}</td>
                <td className="p-4 text-slate-600">{fmtDate(i.date)}</td>
                <td className="p-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[i.category]}`}>{i.category}</span>
                  {i.isConfidential && <span className="ml-1 text-xs text-red-600">confidential</span>}
                </td>
                <td className="p-4 text-slate-600">{i.points}</td>
                <td className="p-4 text-slate-600">
                  <p>{i.description}</p>
                  {i.location && <p className="text-xs text-slate-500">at {i.location}</p>}
                  {i.followUpRequired && <p className="text-xs text-amber-700">Follow-up required</p>}
                </td>
                <td className="p-4 text-slate-600">{i.recordedBy.name ?? i.recordedBy.email}</td>
              </tr>
            ))}
            {incidents?.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState icon={HeartHandshake} title="No incidents yet" description="Logged behaviour incidents will appear here." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!isAdmin && <p className="mt-2 text-xs text-slate-500">Confidential incidents recorded by other staff are hidden from you.</p>}
    </div>
  );
}

function PointsTab() {
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [formGroups, setFormGroups] = useState<FormGroup[]>([]);
  const [entries, setEntries] = useState<PointsEntry[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [pupilId, setPupilId] = useState("");
  const [points, setPoints] = useState("1");
  const [category, setCategory] = useState<PointsCategory>("ACHIEVEMENT");
  const [reason, setReason] = useState("");

  const [boardFormGroupId, setBoardFormGroupId] = useState("");
  const [boardYearGroup, setBoardYearGroup] = useState<YearGroup | "">("");

  function load() {
    fetch("/api/behaviour/points")
      .then((r) => (r.ok ? r.json() : []))
      .then(setEntries);
    fetch("/api/pupils")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPupils(Array.isArray(data) ? data : []))
      .catch(() => setPupils([]));
    fetch("/api/form-groups")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFormGroups(Array.isArray(data) ? data : []))
      .catch(() => setFormGroups([]));
  }
  useEffect(load, []);

  function loadLeaderboard() {
    const params = new URLSearchParams();
    if (boardFormGroupId) params.set("formGroupId", boardFormGroupId);
    if (boardYearGroup) params.set("yearGroup", boardYearGroup);
    const query = params.toString() ? `?${params.toString()}` : "";
    fetch(`/api/behaviour/points/leaderboard${query}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setLeaderboard);
  }
  useEffect(loadLeaderboard, [boardFormGroupId, boardYearGroup]);

  async function awardPoints(e: React.FormEvent) {
    e.preventDefault();
    if (!pupilId || !reason) return;
    const parsedPoints = parseInt(points, 10);
    if (!parsedPoints) return;
    setSubmitting(true);
    try {
      await fetch("/api/behaviour/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pupilId, points: parsedPoints, category, reason }),
      });
      setPupilId("");
      setPoints("1");
      setCategory("ACHIEVEMENT");
      setReason("");
      setShowForm(false);
      load();
      loadLeaderboard();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-700">{entries ? `${entries.length} points entries` : ""}</p>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Award points"}</Button>
      </div>

      {showForm && (
        <form onSubmit={awardPoints} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <select required value={pupilId} onChange={(e) => setPupilId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select pupil…</option>
            {pupils.map((p) => (
              <option key={p.id} value={p.id}>
                {pupilName(p)}
              </option>
            ))}
          </select>
          <input
            required
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="Points (use a negative number for a sanction)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value as PointsCategory)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {(Object.keys(POINTS_CATEGORY_LABELS) as PointsCategory[]).map((c) => (
              <option key={c} value={c}>
                {POINTS_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <Button type="submit" disabled={submitting} className="sm:col-span-2">
            {submitting ? "Saving…" : "Save"}
          </Button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="p-4">Pupil</th>
              <th className="p-4">Date</th>
              <th className="p-4">Category</th>
              <th className="p-4">Points</th>
              <th className="p-4">Reason</th>
              <th className="p-4">Awarded by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries === null && <TableSkeleton rows={5} cols={6} />}
            {entries?.map((e) => (
              <tr key={e.id}>
                <td className="p-4 font-medium text-slate-900">{pupilName(e.pupil)}</td>
                <td className="p-4 text-slate-600">{fmtDate(e.date)}</td>
                <td className="p-4">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {POINTS_CATEGORY_LABELS[e.category]}
                  </span>
                </td>
                <td className={`p-4 font-medium ${e.points >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {e.points > 0 ? `+${e.points}` : e.points}
                </td>
                <td className="p-4 text-slate-600">{e.reason}</td>
                <td className="p-4 text-slate-600">{e.awardedBy.name ?? e.awardedBy.email}</td>
              </tr>
            ))}
            {entries?.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState icon={Star} title="No points awarded yet" description="Awarded points will appear here." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">Leaderboard</p>
          <div className="flex flex-wrap gap-2">
            <select value={boardFormGroupId} onChange={(e) => setBoardFormGroupId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
              <option value="">All form groups</option>
              {formGroups.map((fg) => (
                <option key={fg.id} value={fg.id}>
                  {fg.name}
                </option>
              ))}
            </select>
            <select value={boardYearGroup} onChange={(e) => setBoardYearGroup(e.target.value as YearGroup | "")} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
              <option value="">All year groups</option>
              {(Object.keys(YEAR_GROUP_LABELS) as YearGroup[]).map((yg) => (
                <option key={yg} value={yg}>
                  {YEAR_GROUP_LABELS[yg]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="p-4">#</th>
                <th className="p-4">Pupil</th>
                <th className="p-4">Form group</th>
                <th className="p-4">Year</th>
                <th className="p-4">Total points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboard === null && <TableSkeleton rows={5} cols={5} />}
              {leaderboard?.map((row, idx) => (
                <tr key={row.pupilId}>
                  <td className="p-4 text-slate-500">{idx + 1}</td>
                  <td className="p-4 font-medium text-slate-900">{pupilName(row)}</td>
                  <td className="p-4 text-slate-600">{row.formGroup?.name ?? "—"}</td>
                  <td className="p-4 text-slate-600">{YEAR_GROUP_LABELS[row.yearGroup]}</td>
                  <td className="p-4 font-semibold text-slate-900">{row.totalPoints}</td>
                </tr>
              ))}
              {leaderboard?.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={Star} title="No pupils to rank" description="Adjust the filters or award some points first." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DetentionsTab() {
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [detentions, setDetentions] = useState<Detention[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [pupilId, setPupilId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");

  function load() {
    fetch("/api/behaviour/detentions")
      .then((r) => (r.ok ? r.json() : []))
      .then(setDetentions);
    fetch("/api/pupils")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPupils(Array.isArray(data) ? data : []))
      .catch(() => setPupils([]));
  }
  useEffect(load, []);

  async function scheduleDetention(e: React.FormEvent) {
    e.preventDefault();
    if (!pupilId || !reason) return;
    setSubmitting(true);
    try {
      await fetch("/api/behaviour/detentions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pupilId, date, reason, location: location || undefined }),
      });
      setPupilId("");
      setReason("");
      setLocation("");
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: string, status: DetentionStatus) {
    await fetch(`/api/behaviour/detentions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-700">{detentions ? `${detentions.length} detentions` : ""}</p>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Schedule detention"}</Button>
      </div>

      {showForm && (
        <form onSubmit={scheduleDetention} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <select required value={pupilId} onChange={(e) => setPupilId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select pupil…</option>
            {pupils.map((p) => (
              <option key={p.id} value={p.id}>
                {pupilName(p)}
              </option>
            ))}
          </select>
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <Button type="submit" disabled={submitting} className="sm:col-span-2">
            {submitting ? "Saving…" : "Save"}
          </Button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="p-4">Pupil</th>
              <th className="p-4">Date</th>
              <th className="p-4">Reason</th>
              <th className="p-4">Status</th>
              <th className="p-4">Scheduled by</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {detentions === null && <TableSkeleton rows={5} cols={6} />}
            {detentions?.map((d) => (
              <tr key={d.id}>
                <td className="p-4 font-medium text-slate-900">{pupilName(d.pupil)}</td>
                <td className="p-4 text-slate-600">{fmtDate(d.date)}</td>
                <td className="p-4 text-slate-600">
                  <p>{d.reason}</p>
                  {d.location && <p className="text-xs text-slate-500">at {d.location}</p>}
                </td>
                <td className="p-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DETENTION_STATUS_STYLES[d.status]}`}>{d.status}</span>
                </td>
                <td className="p-4 text-slate-600">{d.scheduledBy.name ?? d.scheduledBy.email}</td>
                <td className="p-4">
                  {d.status === "SCHEDULED" && (
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setStatus(d.id, "ATTENDED")} className="text-xs">
                        Mark attended
                      </Button>
                      <Button variant="ghost" onClick={() => setStatus(d.id, "MISSED")} className="text-xs">
                        Mark missed
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {detentions?.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState icon={Clock} title="No detentions scheduled" description="Scheduled detentions will appear here." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccidentsTab() {
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [accidents, setAccidents] = useState<Accident[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [pupilId, setPupilId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [injuryType, setInjuryType] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [severity, setSeverity] = useState<AccidentSeverity>("MINOR");
  const [parentNotified, setParentNotified] = useState(false);

  function load() {
    fetch("/api/accidents")
      .then((r) => (r.ok ? r.json() : []))
      .then(setAccidents);
    fetch("/api/pupils")
      .then((r) => r.json())
      .then((data) => setPupils(Array.isArray(data) ? data : []))
      .catch(() => setPupils([]));
  }
  useEffect(load, []);

  async function createAccident(e: React.FormEvent) {
    e.preventDefault();
    if (!pupilId) return;
    setSubmitting(true);
    try {
      await fetch("/api/accidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pupilId,
          date,
          time,
          location,
          description,
          injuryType: injuryType || undefined,
          actionTaken,
          severity,
          parentNotified,
        }),
      });
      setPupilId("");
      setTime("");
      setLocation("");
      setDescription("");
      setInjuryType("");
      setActionTaken("");
      setSeverity("MINOR");
      setParentNotified(false);
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function markParentNotified(id: string) {
    await fetch(`/api/accidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentNotified: true }),
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-700">{accidents ? `${accidents.length} accident reports` : ""}</p>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Log accident"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={createAccident} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <select required value={pupilId} onChange={(e) => setPupilId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select pupil…</option>
            {pupils.map((p) => (
              <option key={p.id} value={p.id}>
                {pupilName(p)}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-1/2 rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input required type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-1/2 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <input required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={severity} onChange={(e) => setSeverity(e.target.value as AccidentSeverity)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="MINOR">Minor</option>
            <option value="MODERATE">Moderate</option>
            <option value="SERIOUS">Serious</option>
          </select>
          <input value={injuryType} onChange={(e) => setInjuryType(e.target.value)} placeholder="Injury type (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={parentNotified} onChange={(e) => setParentNotified(e.target.checked)} />
            Parent already notified
          </label>
          <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened?" className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm" rows={3} />
          <textarea required value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} placeholder="Action taken" className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm" rows={2} />
          <Button type="submit" disabled={submitting} className="sm:col-span-2">
            {submitting ? "Saving…" : "Save report"}
          </Button>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="p-4">Pupil</th>
              <th className="p-4">Date / time</th>
              <th className="p-4">Severity</th>
              <th className="p-4">Description</th>
              <th className="p-4">Parent notified</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accidents === null && <TableSkeleton rows={5} cols={6} />}
            {accidents?.map((a) => (
              <tr key={a.id}>
                <td className="p-4 font-medium text-slate-900">{pupilName(a.pupil)}</td>
                <td className="p-4 text-slate-600">
                  {fmtDate(a.date)} {a.time}
                </td>
                <td className="p-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[a.severity]}`}>{a.severity}</span>
                </td>
                <td className="p-4 text-slate-600">
                  <p>{a.description}</p>
                  <p className="text-xs text-slate-500">at {a.location}</p>
                </td>
                <td className="p-4">
                  {a.parentNotified ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Notified</span>
                  ) : (
                    <Button variant="ghost" onClick={() => markParentNotified(a.id)} className="text-xs">
                      Mark notified
                    </Button>
                  )}
                </td>
                <td className="p-4"></td>
              </tr>
            ))}
            {accidents?.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState icon={AlertTriangle} title="No accident reports yet" description="Logged accident reports will appear here." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
