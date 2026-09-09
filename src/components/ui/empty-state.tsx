import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Friendlier stand-in for a plain "No X found." string — used inside a table body or a list panel. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon size={22} />
      </span>
      <p className="font-medium text-slate-900 dark:text-white">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-600 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
