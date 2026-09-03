"use client";

import { useEffect, useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";

type YearGroup =
  | "NURSERY" | "RECEPTION" | "YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4" | "YEAR_5"
  | "YEAR_6" | "YEAR_7" | "YEAR_8" | "YEAR_9" | "YEAR_10" | "YEAR_11" | "YEAR_12" | "YEAR_13";

const YEAR_GROUPS: YearGroup[] = [
  "NURSERY", "RECEPTION", "YEAR_1", "YEAR_2", "YEAR_3", "YEAR_4", "YEAR_5",
  "YEAR_6", "YEAR_7", "YEAR_8", "YEAR_9", "YEAR_10", "YEAR_11", "YEAR_12", "YEAR_13",
];

function yearGroupLabel(yg: YearGroup): string {
  if (yg === "NURSERY") return "Nursery";
  if (yg === "RECEPTION") return "Reception";
  return `Year ${yg.replace("YEAR_", "")}`;
}

type ApplicationType = "NORMAL_ROUND" | "IN_YEAR";
type Status = "RECEIVED" | "OFFERED" | "WAITING_LIST" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";

const STATUSES: Status[] = ["RECEIVED", "OFFERED", "WAITING_LIST", "ACCEPTED", "DECLINED", "WITHDRAWN"];

const STATUS_LABELS: Record<Status, string> = {
  RECEIVED: "Received",
  OFFERED: "Offered",
  WAITING_LIST: "Waiting list",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  WITHDRAWN: "Withdrawn",
};

const STATUS_STYLES: Record<Status, string> = {
  RECEIVED: "bg-slate-100 text-slate-700",
  OFFERED: "bg-sky-100 text-sky-700",
  WAITING_LIST: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  DECLINED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-slate-100 text-slate-500",
};

type Application = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: "MALE" | "FEMALE";
  preferredYearGroup: YearGroup;
  applicationType: ApplicationType;
  status: Status;
  waitingListPosition: number | null;
  guardianName: string;
  guardianEmail: string | null;
  guardianPhone: string | null;
  notes: string | null;
  createdAt: string;
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB");
}

export default function AdmissionsPage() {
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [yearGroupFilter, setYearGroupFilter] = useState<YearGroup | "">("");

  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [preferredYearGroup, setPreferredYearGroup] = useState<YearGroup>("RECEPTION");
  const [applicationType, setApplicationType] = useState<ApplicationType>("NORMAL_ROUND");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (yearGroupFilter) params.set("yearGroup", yearGroupFilter);
    fetch(`/api/admissions?${params.toString()}`)
      .then((r) => {
        if (!r.ok) {
          setLoadError(true);
          return [];
        }
        return r.json();
      })
      .then(setApplications);
  }

  useEffect(load, [statusFilter, yearGroupFilter]);

  async function createApplication(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          dob,
          gender,
          preferredYearGroup,
          applicationType,
          guardianName,
          guardianEmail: guardianEmail || undefined,
          guardianPhone: guardianPhone || undefined,
          notes: notes || undefined,
        }),
      });
      setFirstName("");
      setLastName("");
      setDob("");
      setGuardianName("");
      setGuardianEmail("");
      setGuardianPhone("");
      setNotes("");
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id: string, status: Status) {
    await fetch(`/api/admissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  if (loadError) {
    return (
      <div>
        <PageHeader module="admissions" title="Admissions" />
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
        module="admissions"
        title="Admissions"
        subtitle="Prospective-pupil applications, from first contact through to a place accepted or declined."
        actions={
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "Add application"}
          </Button>
        }
      />

      {showForm && (
        <form
          onSubmit={createApplication}
          className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700">First name</label>
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Last name</label>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Date of birth</label>
            <input
              required
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Preferred year group</label>
            <select
              value={preferredYearGroup}
              onChange={(e) => setPreferredYearGroup(e.target.value as YearGroup)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {YEAR_GROUPS.map((yg) => (
                <option key={yg} value={yg}>
                  {yearGroupLabel(yg)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Application type</label>
            <select
              value={applicationType}
              onChange={(e) => setApplicationType(e.target.value as ApplicationType)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="NORMAL_ROUND">Normal round</option>
              <option value="IN_YEAR">In-year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Guardian name</label>
            <input
              required
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Guardian email</label>
            <input
              type="email"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Guardian phone</label>
            <input
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Add application"}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "")}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={yearGroupFilter}
          onChange={(e) => setYearGroupFilter(e.target.value as YearGroup | "")}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All year groups</option>
          {YEAR_GROUPS.map((yg) => (
            <option key={yg} value={yg}>
              {yearGroupLabel(yg)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="p-4">Applicant</th>
              <th className="p-4">DOB</th>
              <th className="p-4">Year group</th>
              <th className="p-4">Type</th>
              <th className="p-4">Guardian</th>
              <th className="p-4">Status</th>
              <th className="p-4">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications === null && <TableSkeleton rows={5} cols={7} />}
            {applications?.map((a) => (
              <tr key={a.id} className="transition-colors hover:bg-slate-50">
                <td className="p-4">
                  <p className="font-medium text-slate-900">
                    {a.firstName} {a.lastName}
                  </p>
                  {a.guardianEmail && <p className="text-xs text-slate-500">{a.guardianEmail}</p>}
                </td>
                <td className="p-4 text-slate-600">{fmtDate(a.dob)}</td>
                <td className="p-4 text-slate-600">{yearGroupLabel(a.preferredYearGroup)}</td>
                <td className="p-4 text-slate-600">{a.applicationType === "NORMAL_ROUND" ? "Normal round" : "In-year"}</td>
                <td className="p-4">
                  <p className="text-slate-900">{a.guardianName}</p>
                  {a.guardianPhone && <p className="text-xs text-slate-500">{a.guardianPhone}</p>}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <select
                      value={a.status}
                      onChange={(e) => updateStatus(a.id, e.target.value as Status)}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[a.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    {a.status === "WAITING_LIST" && a.waitingListPosition != null && (
                      <span className="text-xs text-slate-500">#{a.waitingListPosition}</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-slate-600">{fmtDate(a.createdAt)}</td>
              </tr>
            ))}
            {applications?.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={UserPlus}
                    title="No applications yet"
                    description="Add a prospective pupil's application to start tracking it through the admissions pipeline."
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
