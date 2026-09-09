"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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

type Pupil = {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  dob: string;
  gender: "MALE" | "FEMALE";
  yearGroup: YearGroup;
  formGroupId: string | null;
  ethnicity: string | null;
  homeLanguage: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  sendStatus: "NONE" | "SEND_SUPPORT" | "EHCP";
  pupilPremium: boolean;
  freeSchoolMeals: boolean;
  medicalNotes: string | null;
  isActive: boolean;
};

export function EditPupilForm({ pupil, isAdmin }: { pupil: Pupil; isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formGroups, setFormGroups] = useState<{ id: string; name: string }[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fields, setFields] = useState({
    firstName: pupil.firstName,
    lastName: pupil.lastName,
    preferredName: pupil.preferredName ?? "",
    dob: pupil.dob.slice(0, 10),
    gender: pupil.gender,
    yearGroup: pupil.yearGroup,
    formGroupId: pupil.formGroupId ?? "",
    ethnicity: pupil.ethnicity ?? "",
    homeLanguage: pupil.homeLanguage ?? "",
    addressLine1: pupil.addressLine1 ?? "",
    addressLine2: pupil.addressLine2 ?? "",
    city: pupil.city ?? "",
    postcode: pupil.postcode ?? "",
    sendStatus: pupil.sendStatus,
    pupilPremium: pupil.pupilPremium,
    freeSchoolMeals: pupil.freeSchoolMeals,
    medicalNotes: pupil.medicalNotes ?? "",
    isActive: pupil.isActive,
  });

  useEffect(() => {
    if (open && formGroups === null) {
      fetch("/api/form-groups").then((r) => (r.ok ? r.json() : [])).then(setFormGroups);
    }
  }, [open, formGroups]);

  function set<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pupils/${pupil.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          preferredName: fields.preferredName || null,
          formGroupId: fields.formGroupId || null,
          ethnicity: fields.ethnicity || null,
          homeLanguage: fields.homeLanguage || null,
          addressLine1: fields.addressLine1 || null,
          addressLine2: fields.addressLine2 || null,
          city: fields.city || null,
          postcode: fields.postcode || null,
          medicalNotes: fields.medicalNotes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Couldn't save those changes.");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function deletePupil() {
    if (!window.confirm(`Delete ${pupil.firstName} ${pupil.lastName}? This moves them to the trash and hides them from every list — an admin can still restore them from the database if needed, but they'll disappear from the app immediately.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/pupils/${pupil.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Couldn't delete this pupil.");
        setDeleting(false);
        return;
      }
      router.push("/portal/pupils");
    } catch {
      setDeleting(false);
    }
  }

  const inputClass = "rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900";

  return (
    <div>
      <div className="flex gap-1.5">
        <Button variant="secondary" size="sm" onClick={() => setOpen(!open)}>
          {open ? "Cancel" : "Edit details"}
        </Button>
        {isAdmin && (
          <Button variant="danger" size="sm" onClick={deletePupil} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        )}
      </div>

      {open && (
        <form onSubmit={save} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900">
          <input required value={fields.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="First name" className={inputClass} />
          <input required value={fields.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Last name" className={inputClass} />
          <input value={fields.preferredName} onChange={(e) => set("preferredName", e.target.value)} placeholder="Preferred name (optional)" className={inputClass} />
          <label className="text-xs text-slate-600 dark:text-slate-400">
            Date of birth
            <input required type="date" value={fields.dob} onChange={(e) => set("dob", e.target.value)} className={`mt-1 w-full ${inputClass}`} />
          </label>
          <select value={fields.gender} onChange={(e) => set("gender", e.target.value as "MALE" | "FEMALE")} className={inputClass}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
          <select value={fields.yearGroup} onChange={(e) => set("yearGroup", e.target.value as YearGroup)} className={inputClass}>
            {YEAR_GROUPS.map((yg) => (
              <option key={yg} value={yg}>{yearGroupLabel(yg)}</option>
            ))}
          </select>
          <select value={fields.formGroupId} onChange={(e) => set("formGroupId", e.target.value)} className={inputClass}>
            <option value="">No form group</option>
            {formGroups?.map((fg) => (
              <option key={fg.id} value={fg.id}>{fg.name}</option>
            ))}
          </select>
          <select value={fields.sendStatus} onChange={(e) => set("sendStatus", e.target.value as Pupil["sendStatus"])} className={inputClass}>
            <option value="NONE">No SEND status</option>
            <option value="SEND_SUPPORT">SEND Support</option>
            <option value="EHCP">EHCP</option>
          </select>
          <input value={fields.ethnicity} onChange={(e) => set("ethnicity", e.target.value)} placeholder="Ethnicity (optional)" className={inputClass} />
          <input value={fields.homeLanguage} onChange={(e) => set("homeLanguage", e.target.value)} placeholder="Home language (optional)" className={inputClass} />
          <input value={fields.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} placeholder="Address line 1" className={inputClass} />
          <input value={fields.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} placeholder="Address line 2" className={inputClass} />
          <input value={fields.city} onChange={(e) => set("city", e.target.value)} placeholder="City" className={inputClass} />
          <input value={fields.postcode} onChange={(e) => set("postcode", e.target.value)} placeholder="Postcode" className={inputClass} />
          <textarea
            value={fields.medicalNotes}
            onChange={(e) => set("medicalNotes", e.target.value)}
            placeholder="Medical notes (optional)"
            rows={3}
            className={`sm:col-span-2 ${inputClass}`}
          />
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={fields.pupilPremium} onChange={(e) => set("pupilPremium", e.target.checked)} />
              Pupil Premium
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={fields.freeSchoolMeals} onChange={(e) => set("freeSchoolMeals", e.target.checked)} />
              Free school meals
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={fields.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              Active on roll
            </label>
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={saving} className="sm:col-span-2">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      )}
    </div>
  );
}
