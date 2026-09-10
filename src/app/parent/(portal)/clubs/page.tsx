"use client";

import { useCallback, useEffect, useState } from "react";

type Child = { id: string; firstName: string; lastName: string; preferredName: string | null };
type Membership = { pupilId: string; status: "ACTIVE" | "WAITLIST" };
type Club = {
  id: string;
  name: string;
  description: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number | null;
  staffLead: { name: string | null; email: string | null } | null;
  activeCount: number;
  myChildrenMemberships: Membership[];
};
type Data = { children: Child[]; clubs: Club[] };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ParentClubsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/parent/clubs")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? "Couldn't load clubs");
        }
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function childName(c: Child) {
    return `${c.preferredName || c.firstName} ${c.lastName}`;
  }

  async function toggleMembership(clubId: string, pupilId: string, isMember: boolean) {
    const key = `${clubId}:${pupilId}`;
    setPendingKey(key);
    setActionError(null);
    try {
      const res = await fetch(`/api/parent/children/${pupilId}/clubs`, {
        method: isMember ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong");
      }
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingKey(null);
    }
  }

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>;

  const { children, clubs } = data;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Clubs</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Browse after-school clubs and sign your children up.
      </p>

      {actionError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {actionError}
        </p>
      )}

      {children.length === 0 && (
        <p className="mt-4 rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No children are linked to your account yet.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {clubs.map((c) => {
          const spacesLeft = c.capacity !== null ? c.capacity - c.activeCount : null;
          const isFull = spacesLeft !== null && spacesLeft <= 0;
          return (
            <div key={c.id} className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {DAYS[c.dayOfWeek]} · {c.startTime}–{c.endTime}
                    {c.staffLead && ` · ${c.staffLead.name ?? c.staffLead.email}`}
                  </p>
                  {c.description && <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{c.description}</p>}
                </div>
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isFull
                      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {c.capacity !== null ? `${Math.max(spacesLeft ?? 0, 0)} spaces left` : "Unlimited spaces"}
                </span>
              </div>

              {children.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <ul className="space-y-2">
                    {children.map((child) => {
                      const membership = c.myChildrenMemberships.find((m) => m.pupilId === child.id);
                      const isMember = !!membership;
                      const key = `${c.id}:${child.id}`;
                      const isPending = pendingKey === key;
                      return (
                        <li key={child.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-700 dark:text-slate-200">
                            {childName(child)}
                            {membership?.status === "WAITLIST" && (
                              <span className="ml-2 text-xs font-medium text-amber-700 dark:text-amber-300">Waitlisted</span>
                            )}
                          </span>
                          <button
                            type="button"
                            disabled={isPending || (!isMember && isFull)}
                            onClick={() => toggleMembership(c.id, child.id, isMember)}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              isMember
                                ? "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                                : "bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                            }`}
                          >
                            {isPending ? "…" : isMember ? "Leave" : isFull ? "Full" : "Join"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
        {clubs.length === 0 && (
          <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            No clubs are available at the moment.
          </p>
        )}
      </div>
    </div>
  );
}
