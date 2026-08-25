"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Eye } from "lucide-react";

export function ActingBanner({
  tenantName,
  actorLabel,
  exitHref,
}: {
  tenantName: string;
  actorLabel: string;
  exitHref: string;
}) {
  const { update } = useSession();
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  async function exit() {
    setExiting(true);
    try {
      await update({ actingTenantId: null });
      router.push(exitHref);
      router.refresh();
    } finally {
      setExiting(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-900">
      <span className="flex items-center gap-2">
        <Eye size={15} className="shrink-0" />
        You&apos;re managing <strong>{tenantName}</strong> as {actorLabel}.
      </span>
      <button
        onClick={exit}
        disabled={exiting}
        className="shrink-0 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50"
      >
        {exiting ? "Exiting…" : "Exit"}
      </button>
    </div>
  );
}
