"use client";

import { useEffect, useState } from "react";
import { FileOutput } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type Pupil = { id: string; firstName: string; lastName: string; upn: string | null };
type FormGroup = { id: string; name: string; yearGroup: string };

type ParsedCtfPupil = {
  upn: string | null;
  formerUpn: string | null;
  firstName: string | null;
  middleNames: string | null;
  lastName: string | null;
  dob: string | null;
  gender: "MALE" | "FEMALE" | null;
  ethnicity: string | null;
  homeLanguage: string | null;
  nationality: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  freeSchoolMeals: boolean;
};

type Exchange = {
  id: string;
  direction: "EXPORT" | "IMPORT";
  pupilName: string;
  upn: string | null;
  fileName: string;
  createdAt: string;
  performedBy: { name: string | null; email: string | null };
};

const YEAR_GROUPS = [
  "NURSERY", "RECEPTION", "YEAR_1", "YEAR_2", "YEAR_3", "YEAR_4", "YEAR_5",
  "YEAR_6", "YEAR_7", "YEAR_8", "YEAR_9", "YEAR_10", "YEAR_11", "YEAR_12", "YEAR_13",
];

export default function CtfPage() {
  const [pupils, setPupils] = useState<Pupil[] | null>(null);
  const [formGroups, setFormGroups] = useState<FormGroup[] | null>(null);
  const [exportPupilId, setExportPupilId] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[] | null>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCtfPupil | null>(null);
  const [reviewYearGroup, setReviewYearGroup] = useState("RECEPTION");
  const [reviewFormGroupId, setReviewFormGroupId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function loadExchanges() {
    fetch("/api/ctf/exchanges").then((r) => (r.ok ? r.json() : [])).then(setExchanges);
  }

  useEffect(() => {
    fetch("/api/pupils").then((r) => (r.ok ? r.json() : [])).then(setPupils);
    fetch("/api/form-groups").then((r) => (r.ok ? r.json() : [])).then(setFormGroups);
    loadExchanges();
  }, []);

  async function handleImportUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportError(null);
    setParsed(null);
    try {
      const form = new FormData();
      form.append("file", importFile);
      const res = await fetch("/api/ctf/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Couldn't read that file.");
        return;
      }
      setParsed(data.pupil);
    } finally {
      setImporting(false);
    }
  }

  async function confirmImport() {
    if (!parsed) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      const res = await fetch("/api/ctf/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed,
          dob: parsed.dob ?? undefined,
          upn: parsed.upn ?? undefined,
          formerUpn: parsed.formerUpn ?? undefined,
          firstName: parsed.firstName ?? "",
          lastName: parsed.lastName ?? "",
          gender: parsed.gender ?? "MALE",
          ethnicity: parsed.ethnicity ?? undefined,
          homeLanguage: parsed.homeLanguage ?? undefined,
          nationality: parsed.nationality ?? undefined,
          addressLine1: parsed.addressLine1 ?? undefined,
          addressLine2: parsed.addressLine2 ?? undefined,
          city: parsed.city ?? undefined,
          postcode: parsed.postcode ?? undefined,
          yearGroup: reviewYearGroup,
          formGroupId: reviewFormGroupId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConfirmError(data.error ?? "Couldn't create the pupil record.");
        return;
      }
      setParsed(null);
      setImportFile(null);
      loadExchanges();
      fetch("/api/pupils").then((r) => (r.ok ? r.json() : [])).then(setPupils);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div>
      <PageHeader
        module="ctf"
        title="CTF exchange"
        subtitle="Export or import a pupil record in the DfE Common Transfer File format."
      />

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        This targets the well-documented core CTF structure (UPN, name, DOB, sex, address, ethnicity,
        SEN, FSM, school history) rather than a byte-verified copy of the current DfE XSD. Check a
        sample export against the receiving school&apos;s system before relying on it for a real transfer.
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Export a pupil</h2>
          <p className="mt-1 text-sm text-slate-600">Download a CTF file to send with a pupil moving to another school.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <select
              value={exportPupilId}
              onChange={(e) => setExportPupilId(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Choose a pupil…</option>
              {pupils?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName}, {p.firstName} {p.upn ? `(${p.upn})` : ""}
                </option>
              ))}
            </select>
            <a
              href={exportPupilId ? `/api/ctf/export?pupilId=${exportPupilId}` : undefined}
              onClick={() => setTimeout(loadExchanges, 1500)}
              aria-disabled={!exportPupilId}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-600 ${!exportPupilId ? "pointer-events-none opacity-50" : ""}`}
            >
              Download CTF
            </a>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Import a pupil</h2>
          <p className="mt-1 text-sm text-slate-600">Upload a CTF file received from another school — you&apos;ll review it before it&apos;s saved.</p>
          <form onSubmit={handleImportUpload} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <Button type="submit" disabled={!importFile || importing}>
              {importing ? "Reading…" : "Read file"}
            </Button>
          </form>
          {importError && <p className="mt-3 text-sm text-red-600">{importError}</p>}
        </section>
      </div>

      {parsed && (
        <section className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <h2 className="font-semibold text-indigo-900">Review before saving</h2>
          <p className="mt-1 text-sm text-indigo-800">
            This is what was read from the file. A CTF doesn&apos;t carry a year group or form group, so pick those below.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg bg-white p-4 text-sm sm:grid-cols-2">
            <p><span className="text-slate-600">Name:</span> {parsed.firstName} {parsed.middleNames} {parsed.lastName}</p>
            <p><span className="text-slate-600">UPN:</span> {parsed.upn ?? "—"}</p>
            <p><span className="text-slate-600">DOB:</span> {parsed.dob ?? "—"}</p>
            <p><span className="text-slate-600">Gender:</span> {parsed.gender ?? "—"}</p>
            <p><span className="text-slate-600">Ethnicity:</span> {parsed.ethnicity ?? "—"}</p>
            <p><span className="text-slate-600">First language:</span> {parsed.homeLanguage ?? "—"}</p>
            <p><span className="text-slate-600">Address:</span> {[parsed.addressLine1, parsed.city, parsed.postcode].filter(Boolean).join(", ") || "—"}</p>
            <p><span className="text-slate-600">FSM eligible:</span> {parsed.freeSchoolMeals ? "Yes" : "No"}</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select value={reviewYearGroup} onChange={(e) => setReviewYearGroup(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              {YEAR_GROUPS.map((yg) => (
                <option key={yg} value={yg}>{yg.replace(/_/g, " ")}</option>
              ))}
            </select>
            <select value={reviewFormGroupId} onChange={(e) => setReviewFormGroupId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">No form group yet</option>
              {formGroups?.map((fg) => (
                <option key={fg.id} value={fg.id}>{fg.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button onClick={confirmImport} disabled={confirming}>
                {confirming ? "Saving…" : "Save pupil"}
              </Button>
              <Button variant="secondary" onClick={() => setParsed(null)}>Discard</Button>
            </div>
          </div>
          {confirmError && <p className="mt-3 text-sm text-red-600">{confirmError}</p>}
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">Recent exchanges</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="p-4">Direction</th>
                <th className="p-4">Pupil</th>
                <th className="p-4">UPN</th>
                <th className="p-4">By</th>
                <th className="p-4">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exchanges?.map((ex) => (
                <tr key={ex.id}>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ex.direction === "EXPORT" ? "bg-cyan-100 text-cyan-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {ex.direction === "EXPORT" ? "Exported" : "Imported"}
                    </span>
                  </td>
                  <td className="p-4 text-slate-900">{ex.pupilName}</td>
                  <td className="p-4 text-slate-600">{ex.upn ?? "—"}</td>
                  <td className="p-4 text-slate-600">{ex.performedBy.name ?? ex.performedBy.email}</td>
                  <td className="p-4 text-slate-600">{new Date(ex.createdAt).toLocaleString("en-GB")}</td>
                </tr>
              ))}
              {exchanges?.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={FileOutput} title="No CTF exchanges yet" description="Exports and imports will show up here." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
