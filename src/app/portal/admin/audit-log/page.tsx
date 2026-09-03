"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";

type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string | null; email: string | null } | null;
};

// Ordered roughly by how often a school would want to filter by it —
// record-access entries first, since "who looked at this" is the question
// this page mainly exists to answer.
const ENTITY_TYPES = ["Pupil", "SendPlan", "SCR", "StaffProfile", "User"];

function describeAction(action: string): string {
  const labels: Record<string, string> = {
    "pupil.viewed": "Viewed pupil record",
    "pupil.updated": "Updated pupil record",
    "pupil.deleted": "Permanently deleted pupil",
    "send.viewed": "Viewed SEND plan",
    "send.register_viewed": "Opened SEND register",
    "send.created": "Created SEND plan",
    "send.updated": "Updated SEND plan",
    "scr.viewed": "Opened Single Central Record",
    "scr.check_recorded": "Recorded a vetting check",
    "user.invited": "Invited a user",
  };
  return labels[action] ?? action;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const pageSize = 50;

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (entityType) params.set("entityType", entityType);
    fetch(`/api/admin/audit-log?${params}`)
      .then((r) => (r.ok ? r.json() : { entries: [], total: 0 }))
      .then((data) => {
        setEntries(data.entries);
        setTotal(data.total);
      });
  }, [page, entityType]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        module="audit-log"
        title="Audit log"
        subtitle="Who accessed or changed what, and when — pupil records, SEND plans, and the Single Central Record."
      />

      <div className="mt-4 flex items-center gap-2">
        <select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All record types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {entries === null ? (
          <table className="w-full text-left text-sm">
            <tbody>
              <TableSkeleton rows={8} cols={4} />
            </tbody>
          </table>
        ) : entries.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" description="Record access and changes will show up here." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="p-4">When</th>
                <th className="p-4">Who</th>
                <th className="p-4">Action</th>
                <th className="p-4">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="p-4 whitespace-nowrap text-slate-600">{new Date(e.createdAt).toLocaleString("en-GB")}</td>
                  <td className="p-4">
                    <p className="font-medium text-slate-900">{e.user?.name ?? "Unknown"}</p>
                    <p className="text-xs text-slate-700">{e.user?.email}</p>
                  </td>
                  <td className="p-4 text-slate-900">{describeAction(e.action)}</td>
                  <td className="p-4 text-slate-600">
                    {e.entityType}
                    {e.entityId ? ` · ${e.entityId.slice(-8)}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {page} of {totalPages} · {total} entries
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
