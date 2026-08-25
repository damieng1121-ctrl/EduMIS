"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { FEATURE_KEYS, FEATURE_INFO, type FeatureKey } from "@/lib/features";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  phase: string;
  urn: string | null;
  isActive: boolean;
  trustId: string | null;
  enabledFeatures: string[];
  createdAt: string;
  _count: { users: number; pupils: number };
};

type Trust = {
  id: string;
  name: string;
  slug: string;
  tenants: { id: string; name: string }[];
  _count: { tenants: number; users: number };
};

type PlatformUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: "SUPER_ADMIN" | "TRUST_ADMIN" | "TENANT_ADMIN" | "STAFF";
  tenantId: string | null;
  trustId: string | null;
  tenant: { name: string } | null;
  isActive: boolean;
  twoFactorEnabled: boolean;
  _count: { accounts: number };
};

const PHASES = ["NURSERY", "PRIMARY", "SECONDARY", "ALL_THROUGH", "SPECIAL", "MULTI_ACADEMY_TRUST"];
const ROLES = ["STAFF", "TENANT_ADMIN", "TRUST_ADMIN", "SUPER_ADMIN"] as const;

function roleLabel(r: string): string {
  if (r === "SUPER_ADMIN") return "Super admin";
  if (r === "TRUST_ADMIN") return "Trust admin";
  if (r === "TENANT_ADMIN") return "Admin";
  return "Staff";
}

/** Turns withApiErrors' {error, issues} shape into a readable message instead of the generic "Invalid request". */
function describeApiError(data: { error?: string; issues?: { path: (string | number)[]; message: string }[] }): string {
  if (data.issues?.length) {
    return data.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ");
  }
  return data.error ?? "Something went wrong";
}

export default function SuperAdminPage() {
  const { update } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"schools" | "trusts" | "users" | "features">("schools");
  const [managingId, setManagingId] = useState<string | null>(null);

  async function manageSchool(id: string) {
    setManagingId(id);
    try {
      await update({ actingTenantId: id });
      router.push("/portal");
      router.refresh();
    } finally {
      setManagingId(null);
    }
  }

  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  // Refs update synchronously (unlike state, which batches) — toggleFeature reads
  // this instead of its own `tenant` argument so that clicking several checkboxes
  // in quick succession each computes its diff against the truly latest list,
  // instead of a stale snapshot from the render that queued the click.
  const tenantsRef = useRef<Tenant[] | null>(null);
  useEffect(() => {
    tenantsRef.current = tenants;
  }, [tenants]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [phase, setPhase] = useState("PRIMARY");
  const [urn, setUrn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [trusts, setTrusts] = useState<Trust[] | null>(null);
  const [trustName, setTrustName] = useState("");
  const [trustSlug, setTrustSlug] = useState("");
  const [trustError, setTrustError] = useState<string | null>(null);
  const [trustSubmitting, setTrustSubmitting] = useState(false);

  const [users, setUsers] = useState<PlatformUser[] | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [uEmail, setUEmail] = useState("");
  const [uName, setUName] = useState("");
  const [uRole, setURole] = useState<(typeof ROLES)[number]>("STAFF");
  const [uTenantId, setUTenantId] = useState("");
  const [uTrustId, setUTrustId] = useState("");
  const [uError, setUError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  function loadTenants() {
    fetch("/api/super-admin/tenants")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTenants);
  }
  function loadTrusts() {
    fetch("/api/super-admin/trusts")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTrusts);
  }
  function loadUsers() {
    fetch("/api/super-admin/users")
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsers);
  }
  useEffect(() => {
    loadTenants();
    loadTrusts();
    loadUsers();
  }, []);

  async function createTenant(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, domain, phase, urn: urn || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(describeApiError(data));
        return;
      }
      setName("");
      setSlug("");
      setDomain("");
      setUrn("");
      loadTenants();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/super-admin/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    loadTenants();
  }

  async function setTenantTrust(id: string, trustId: string) {
    await fetch(`/api/super-admin/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trustId: trustId || null }),
    });
    loadTenants();
    loadTrusts();
  }

  async function toggleFeature(tenantId: string, key: FeatureKey) {
    // Read the freshest list via the ref, not the `tenant` object captured at
    // render time — clicking several checkboxes on the same row in quick
    // succession would otherwise each diff against the same stale snapshot
    // and the later PATCHes would silently overwrite the earlier ones.
    const current = tenantsRef.current?.find((t) => t.id === tenantId)?.enabledFeatures ?? [];
    const enabledFeatures = current.includes(key) ? current.filter((f) => f !== key) : [...current, key];
    // Optimistic update so the checkbox responds immediately, not after a
    // round-trip — and it's the only update, since a follow-up full reload
    // here would risk resolving late and clobbering a more recent toggle
    // with stale server data (the same race this whole function exists to avoid).
    setTenants((prev) => prev?.map((t) => (t.id === tenantId ? { ...t, enabledFeatures } : t)) ?? prev);
    await fetch(`/api/super-admin/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabledFeatures }),
    });
  }

  async function createTrust(e: React.FormEvent) {
    e.preventDefault();
    setTrustSubmitting(true);
    setTrustError(null);
    try {
      const res = await fetch("/api/super-admin/trusts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trustName, slug: trustSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTrustError(describeApiError(data));
        return;
      }
      setTrustName("");
      setTrustSlug("");
      loadTrusts();
    } finally {
      setTrustSubmitting(false);
    }
  }

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setUError(null);
    try {
      const res = await fetch("/api/super-admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: uEmail,
          name: uName || undefined,
          role: uRole,
          tenantId: uRole === "STAFF" || uRole === "TENANT_ADMIN" ? uTenantId || null : null,
          trustId: uRole === "TRUST_ADMIN" ? uTrustId || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUError(describeApiError(data));
        return;
      }
      setUEmail("");
      setUName("");
      setURole("STAFF");
      setUTenantId("");
      setUTrustId("");
      setShowInvite(false);
      loadUsers();
    } finally {
      setInviting(false);
    }
  }

  async function reassignUser(id: string, patch: Partial<Pick<PlatformUser, "role" | "tenantId" | "trustId" | "isActive">>) {
    setUsersError(null);
    const res = await fetch(`/api/super-admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setUsersError(data ? describeApiError(data) : "Couldn't update that user.");
    }
    loadUsers();
  }

  return (
    <div>
      <PageHeader
        module="school"
        title="Platform administration"
        subtitle="Manage every school, Trust, and user across EduMIS."
        actions={
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {(["schools", "trusts", "users", "features"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:text-slate-900"}`}
              >
                {t}
              </button>
            ))}
          </div>
        }
      />

      {tab === "schools" && (
        <>
          <p className="mt-4 text-sm text-slate-600">
            Onboard a new school by registering its Google Workspace domain — the first person who
            signs in from that domain is auto-provisioned as staff.
          </p>

          <form onSubmit={createTenant} className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">School name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Willowbrook Primary School"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">URL slug</label>
              <input
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="willowbrook"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Google Workspace domain</label>
              <input
                required
                value={domain}
                onChange={(e) => setDomain(e.target.value.toLowerCase())}
                placeholder="willowbrook-primary.sch.uk"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Phase</label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {PHASES.map((p) => (
                  <option key={p} value={p}>
                    {p.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">DfE URN (optional)</label>
              <input
                value={urn}
                onChange={(e) => setUrn(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Add school"}
              </Button>
            </div>
            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          </form>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="p-4">School</th>
                  <th className="p-4">Domain</th>
                  <th className="p-4">Trust</th>
                  <th className="p-4">Users</th>
                  <th className="p-4">Pupils</th>
                  <th className="p-4">Status</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants?.map((t) => (
                  <tr key={t.id}>
                    <td className="p-4">
                      <p className="font-medium text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-700">/{t.slug} · {t.phase.replace(/_/g, " ")}</p>
                    </td>
                    <td className="p-4 text-slate-600">{t.domain}</td>
                    <td className="p-4">
                      <select
                        value={t.trustId ?? ""}
                        onChange={(e) => setTenantTrust(t.id, e.target.value)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">Standalone</option>
                        {trusts?.map((tr) => (
                          <option key={tr.id} value={tr.id}>
                            {tr.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-slate-600">{t._count.users}</td>
                    <td className="p-4 text-slate-600">{t._count.pupils}</td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleActive(t.id, t.isActive)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          t.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.isActive ? "Active" : "Suspended"}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => manageSchool(t.id)}
                        disabled={managingId === t.id || !t.isActive}
                      >
                        {managingId === t.id ? "Opening…" : "Manage"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {tenants?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-sm text-slate-700">
                      No schools yet — add one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "features" && (
        <>
          <p className="mt-4 text-sm text-slate-600">
            Switch optional modules on per school. Nothing here is on by default — a school only sees a
            module once you&apos;ve enabled it for them.
          </p>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="p-4">School</th>
                  {FEATURE_KEYS.map((key) => (
                    <th key={key} className="p-4" title={FEATURE_INFO[key].description}>
                      {FEATURE_INFO[key].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants?.map((t) => (
                  <tr key={t.id}>
                    <td className="p-4">
                      <p className="font-medium text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-700">/{t.slug}</p>
                    </td>
                    {FEATURE_KEYS.map((key) => (
                      <td key={key} className="p-4">
                        <label className="flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            checked={t.enabledFeatures.includes(key)}
                            onChange={() => toggleFeature(t.id, key)}
                          />
                          <span className="sr-only">{FEATURE_INFO[key].label}</span>
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
                {tenants?.length === 0 && (
                  <tr>
                    <td colSpan={FEATURE_KEYS.length + 1} className="p-6 text-center text-sm text-slate-700">
                      No schools yet — add one from the Schools tab.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "trusts" && (
        <>
          <p className="mt-4 text-sm text-slate-600">
            A Trust groups schools under shared leadership — a small Federation (2-3 schools) and a
            large Multi-Academy Trust both work the same way. Assign schools to a Trust from the{" "}
            <button onClick={() => setTab("schools")} className="text-indigo-600 hover:underline">
              Schools
            </button>{" "}
            tab, and add a Trust admin from the Users tab once the Trust exists.
          </p>

          <form onSubmit={createTrust} className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Trust name</label>
              <input
                required
                value={trustName}
                onChange={(e) => setTrustName(e.target.value)}
                placeholder="Oak Learning Trust"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">URL slug</label>
              <input
                required
                value={trustSlug}
                onChange={(e) => setTrustSlug(e.target.value.toLowerCase())}
                placeholder="oak-learning-trust"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={trustSubmitting}>
                {trustSubmitting ? "Creating…" : "Add Trust"}
              </Button>
            </div>
            {trustError && <p className="sm:col-span-3 text-sm text-red-600">{trustError}</p>}
          </form>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="p-4">Trust</th>
                  <th className="p-4">Schools</th>
                  <th className="p-4">Trust admins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trusts?.map((tr) => (
                  <tr key={tr.id}>
                    <td className="p-4">
                      <p className="font-medium text-slate-900">{tr.name}</p>
                      <p className="text-xs text-slate-700">/{tr.slug}</p>
                    </td>
                    <td className="p-4 text-slate-600">
                      {tr.tenants.length === 0 ? "—" : tr.tenants.map((t) => t.name).join(", ")}
                    </td>
                    <td className="p-4 text-slate-600">{tr._count.users}</td>
                  </tr>
                ))}
                {trusts?.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-sm text-slate-700">
                      No Trusts yet — add one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "users" && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Every user across every school and Trust, plus platform staff. Add someone directly, or move an
              existing user to a different school.
            </p>
            <Button className="shrink-0" onClick={() => setShowInvite(!showInvite)}>
              {showInvite ? "Cancel" : "Add user"}
            </Button>
          </div>

          {showInvite && (
            <form onSubmit={inviteUser} className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
              <input
                required
                type="email"
                value={uEmail}
                onChange={(e) => setUEmail(e.target.value)}
                placeholder="Email address"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={uName}
                onChange={(e) => setUName(e.target.value)}
                placeholder="Name (optional)"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={uRole}
                onChange={(e) => setURole(e.target.value as typeof uRole)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
              {uRole === "TRUST_ADMIN" ? (
                <select
                  value={uTrustId}
                  onChange={(e) => setUTrustId(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select a Trust…</option>
                  {trusts?.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={uTenantId}
                  disabled={uRole === "SUPER_ADMIN"}
                  onChange={(e) => setUTenantId(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-600"
                >
                  <option value="">Select a school…</option>
                  {tenants?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
              {uError && <p className="text-sm text-red-600 sm:col-span-4">{uError}</p>}
              <Button type="submit" disabled={inviting} className="sm:col-span-4">
                {inviting ? "Adding…" : "Add user"}
              </Button>
            </form>
          )}

          {usersError && <p className="mt-4 text-sm text-red-600">{usersError}</p>}

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">School / Trust</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">2FA</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users?.map((u) => (
                  <tr key={u.id}>
                    <td className="p-4">
                      <p className="font-medium text-slate-900">
                        {u.name ?? "—"}
                        {u._count.accounts === 0 && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Pending sign-in
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-700">{u.email}</p>
                    </td>
                    <td className="p-4">
                      {u.role === "SUPER_ADMIN" ? (
                        <span className="text-xs text-slate-600">Platform (no school)</span>
                      ) : u.role === "TRUST_ADMIN" ? (
                        <select
                          value={u.trustId ?? ""}
                          onChange={(e) => reassignUser(u.id, { trustId: e.target.value || null })}
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                        >
                          <option value="" disabled>
                            Select a Trust…
                          </option>
                          {trusts?.map((tr) => (
                            <option key={tr.id} value={tr.id}>
                              {tr.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={u.tenantId ?? ""}
                          onChange={(e) => reassignUser(u.id, { tenantId: e.target.value || null })}
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                        >
                          <option value="" disabled>
                            Select a school…
                          </option>
                          {tenants?.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        onChange={(e) => {
                          const newRole = e.target.value as PlatformUser["role"];
                          if (newRole === "TRUST_ADMIN") {
                            reassignUser(u.id, { role: newRole, tenantId: null, trustId: trusts?.[0]?.id ?? null });
                          } else if (newRole === "SUPER_ADMIN") {
                            reassignUser(u.id, { role: newRole, tenantId: null, trustId: null });
                          } else {
                            reassignUser(u.id, { role: newRole, tenantId: u.tenantId, trustId: null });
                          }
                        }}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-slate-700">{u.twoFactorEnabled ? "Enabled" : "Not set up"}</td>
                    <td className="p-4">
                      <button
                        onClick={() => reassignUser(u.id, { isActive: !u.isActive })}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.isActive ? "Active" : "Disabled"}
                      </button>
                    </td>
                  </tr>
                ))}
                {users?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-sm text-slate-700">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
