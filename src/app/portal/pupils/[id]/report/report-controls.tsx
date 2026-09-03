"use client";

import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

type AcademicYearOption = { id: string; name: string };

export function ReportControls({
  pupilId,
  academicYears,
  selectedYearId,
  terms,
  selectedTerm,
}: {
  pupilId: string;
  academicYears: AcademicYearOption[];
  selectedYearId: string;
  terms: string[];
  selectedTerm: string;
}) {
  const router = useRouter();

  function navigate(yearId: string, term: string) {
    const params = new URLSearchParams({ academicYearId: yearId });
    if (term !== "ALL") params.set("term", term);
    router.push(`/portal/pupils/${pupilId}/report?${params}`);
  }

  return (
    <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={selectedYearId}
          onChange={(e) => navigate(e.target.value, "ALL")}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
        <select
          value={selectedTerm}
          onChange={(e) => navigate(selectedYearId, e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="ALL">Whole year</option>
          {terms.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <Button onClick={() => window.print()}>
        <Printer size={16} className="mr-1.5 inline" />
        Print / Save as PDF
      </Button>
    </div>
  );
}
