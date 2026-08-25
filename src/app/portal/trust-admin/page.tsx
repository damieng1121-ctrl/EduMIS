"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { School } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";

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
      <PageHeader
        module="school"
        title="My Trust"
        subtitle="Every school in your Trust. Open a school to see and manage its full dashboard."
      />

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
            {tenants === null && <TableSkeleton rows={5} cols={6} />}
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
                <td colSpan={6}>
                  <EmptyState
                    icon={School}
                    title="No schools in your Trust yet"
                    description="Ask a platform admin to add one."
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
