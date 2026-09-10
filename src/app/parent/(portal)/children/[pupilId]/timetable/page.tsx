"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Weekday = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";

const WEEKDAYS: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

type Slot = {
  id: string;
  dayOfWeek: Weekday;
  periodNumber: number;
  room: string | null;
  subject: { id: string; name: string };
  teacher: { id: string; name: string | null; email: string };
};

type Data = {
  formGroup: { id: string; name: string } | null;
  slots: Slot[];
};

function teacherName(t: { name: string | null; email: string }) {
  return t.name ?? t.email;
}

export default function ParentChildTimetablePage() {
  const params = useParams<{ pupilId: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/parent/children/${params.pupilId}/timetable`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? "Couldn't load this child's timetable");
        }
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [params.pupilId]);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>;

  const { formGroup, slots } = data;

  const maxPeriod = Math.max(6, ...slots.map((s) => s.periodNumber));
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  function slotAt(day: Weekday, period: number) {
    return slots.find((s) => s.dayOfWeek === day && s.periodNumber === period);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Timetable</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {formGroup ? `Weekly lesson grid for ${formGroup.name}` : "No form group assigned yet"}
      </p>

      <div className="mt-4 overflow-x-auto rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {!formGroup ? (
          <p className="p-6 text-center text-sm text-slate-700 dark:text-slate-200">
            This child hasn&apos;t been assigned to a form group yet, so there&apos;s no timetable to show.
          </p>
        ) : slots.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-700 dark:text-slate-200">Nothing has been timetabled yet.</p>
        ) : (
          <table className="w-full min-w-[720px] table-fixed text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="w-20 p-3">Period</th>
                {WEEKDAYS.map((d) => (
                  <th key={d} className="p-3">
                    {WEEKDAY_LABELS[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {periods.map((period) => (
                <tr key={period}>
                  <td className="p-3 align-top font-medium text-slate-700 dark:text-slate-200">{period}</td>
                  {WEEKDAYS.map((day) => {
                    const slot = slotAt(day, period);
                    return (
                      <td key={day} className="p-2 align-top">
                        {slot ? (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950">
                            <p className="font-medium text-slate-900 dark:text-white">{slot.subject.name}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{teacherName(slot.teacher)}</p>
                            {slot.room && <p className="text-xs text-slate-500 dark:text-slate-400">Room {slot.room}</p>}
                          </div>
                        ) : (
                          <div className="h-full min-h-[3rem] rounded-lg border border-dashed border-slate-200 dark:border-slate-700" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
