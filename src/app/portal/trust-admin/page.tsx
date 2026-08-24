"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  phase: string;
  isActive: boolean;
  _count: { users: number; pupils: number };
};

export default function TrustAdminPage() {
  const { update } = useSession();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [managingId, setManagingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trust-admin/tenants").then((r) => {
      if (!r.ok) {
        setDenied(true);
        return;
      }
      r.json().then(setTenants);
    });
  }, []);

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

  if (denied) {
    return <p className="mt-6 text-sm text-slate-700">Your account isn&apos;t assigned to a Trust yet — ask a platform admin to set this up.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">My Trust</h1>
      <p className="mt-1 text-sm text-slate-600">
        Every school in your Trust. Open a school to see and manage its full dashboard.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="p-4">School</th>
              <th className="p-4">Domain</th>
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
                <td className="p-4 text-slate-600">{t._count.users}</td>
                <td className="p-4 text-slate-600">{t._count.pupils}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      t.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {t.isActive ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => manageSchool(t.id)}
                    disabled={managingId === t.id || !t.isActive}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {managingId === t.id ? "Opening…" : "Manage"}
                  </button>
                </td>
              </tr>
            ))}
            {tenants?.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-slate-700">
                  No schools in your Trust yet — ask a platform admin to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
