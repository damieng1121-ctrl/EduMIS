"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

type WondeConnection = {
  wondeSchoolId: string | null;
  hasApiToken: boolean;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
};

export default function WondeSettingsPage() {
  const { data: session } = useSession();
  const isAdmin =
    session?.user.role === "TENANT_ADMIN" || session?.user.role === "TRUST_ADMIN" || session?.user.role === "SUPER_ADMIN";

  const [connection, setConnection] = useState<WondeConnection | null>(null);
  const [wondeSchoolId, setWondeSchoolId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/wonde")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: WondeConnection | null) => {
        if (!data) return;
        setConnection(data);
        setWondeSchoolId(data.wondeSchoolId ?? "");
        setSyncEnabled(data.syncEnabled);
      });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/wonde", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wondeSchoolId,
          ...(apiToken ? { apiToken } : {}),
          syncEnabled,
        }),
      });
      if (res.ok) {
        const data: WondeConnection = await res.json();
        setConnection(data);
        setApiToken("");
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        module="wonde"
        title="Wonde integration"
        subtitle="Sync your school's roster and timetable data to third-party apps (reading platforms, MFL apps, and more) via Wonde."
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">What this is</h2>
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          <p>
            Wonde is the UK education sector&apos;s standard service for syncing a school&apos;s MIS data out to
            approved third-party apps, so pupils and staff don&apos;t need separate logins set up by hand in every
            app the school uses.
          </p>
          <p>
            To actually go live, your school needs its own Wonde partner agreement — sign up at{" "}
            <a href="https://wonde.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
              wonde.com
            </a>{" "}
            and Wonde will issue an API token for your school. EduMIS doesn&apos;t arrange this on your behalf; the
            fields below just store your school&apos;s own credentials, encrypted, once you have them.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Connection details</h2>
        {connection ? (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Wonde School ID</label>
              <input
                value={wondeSchoolId}
                onChange={(e) => setWondeSchoolId(e.target.value)}
                disabled={!isAdmin}
                placeholder="e.g. A123456789"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-500">Issued by Wonde once your school&apos;s partner agreement is set up.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">API Token</label>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                disabled={!isAdmin}
                placeholder={connection.hasApiToken ? "•••• (already set)" : "Paste your Wonde API token"}
                autoComplete="off"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Stored encrypted. Leave blank to keep the token already on file — this field never shows the real value.
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={syncEnabled}
                  onChange={(e) => setSyncEnabled(e.target.checked)}
                  disabled={!isAdmin}
                />
                Sync enabled
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Turns syncing on once it&apos;s available — has no effect until the connector itself is built (see below).
              </p>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-3">
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                {saved && <span className="text-sm text-emerald-600">Saved.</span>}
              </div>
            )}
            {!isAdmin && <p className="text-sm text-slate-500">Only school admins can change these settings.</p>}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="h-9 animate-pulse rounded-md bg-slate-100" />
            <div className="h-9 animate-pulse rounded-md bg-slate-100" />
            <div className="h-9 animate-pulse rounded-md bg-slate-100" />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Sync status</h2>
        {connection && (
          <div className="mt-4 space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Last synced</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {connection.lastSyncedAt ? new Date(connection.lastSyncedAt).toLocaleString("en-GB") : "Never"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Last sync status</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{connection.lastSyncStatus ?? "—"}</dd>
              </div>
            </dl>
            <div>
              <span title="Sync isn't available yet — see the note below.">
                <Button variant="secondary" disabled>
                  Sync now
                </Button>
              </span>
              <p className="mt-2 text-xs text-slate-500">
                Sync isn&apos;t available yet. Beyond needing your school&apos;s real Wonde credentials above, the
                sync connector itself hasn&apos;t been built in this version of EduMIS — saving credentials here just
                stores them securely, ready for when it is.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
