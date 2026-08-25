import type { ReactNode } from "react";
import { MODULE_THEME, type ModuleKey } from "@/lib/module-theme";

/**
 * Every portal page opens with the same title-bar shape — swaps a plain
 * <h1> for an icon badge (colored per module, so tabs feel distinct at a
 * glance) plus optional subtitle/actions on the same row.
 */
export function PageHeader({
  module,
  title,
  subtitle,
  actions,
}: {
  module: ModuleKey;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  const { icon: Icon, badge } = MODULE_THEME[module];
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${badge} text-white`}>
          <Icon size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
