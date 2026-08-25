import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  GraduationCap,
  CalendarCheck,
  HeartHandshake,
  ClipboardPlus,
  ClipboardList,
  Target,
  TrendingUp,
  PartyPopper,
  Utensils,
  CalendarClock,
  Send,
  IdCard,
  FileSpreadsheet,
  BarChart3,
  Users,
  Settings,
  School,
  ShieldCheck,
} from "lucide-react";

export type ModuleKey =
  | "dashboard"
  | "pupils"
  | "attendance"
  | "behaviour"
  | "send"
  | "assessment"
  | "targets"
  | "interventions"
  | "clubs"
  | "meals"
  | "parents-evenings"
  | "messages"
  | "staff"
  | "census"
  | "reports"
  | "users"
  | "settings"
  | "school"
  | "security";

/** Literal (never interpolated) Tailwind classes — required for the JIT compiler to pick them up. */
const BADGE = {
  indigo: "bg-indigo-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  cyan: "bg-cyan-500",
  rose: "bg-rose-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  lime: "bg-lime-500",
  sky: "bg-sky-500",
  teal: "bg-teal-500",
  slate: "bg-slate-500",
  purple: "bg-purple-500",
  fuchsia: "bg-fuchsia-500",
} as const;

/** One icon + accent color per portal module, reused across nav, page headers, and stat cards. */
export const MODULE_THEME: Record<ModuleKey, { icon: LucideIcon; badge: string }> = {
  dashboard: { icon: LayoutDashboard, badge: BADGE.indigo },
  pupils: { icon: GraduationCap, badge: BADGE.blue },
  attendance: { icon: CalendarCheck, badge: BADGE.emerald },
  behaviour: { icon: HeartHandshake, badge: BADGE.amber },
  send: { icon: ClipboardPlus, badge: BADGE.violet },
  assessment: { icon: ClipboardList, badge: BADGE.cyan },
  targets: { icon: Target, badge: BADGE.rose },
  interventions: { icon: TrendingUp, badge: BADGE.orange },
  clubs: { icon: PartyPopper, badge: BADGE.pink },
  meals: { icon: Utensils, badge: BADGE.lime },
  "parents-evenings": { icon: CalendarClock, badge: BADGE.sky },
  messages: { icon: Send, badge: BADGE.indigo },
  staff: { icon: IdCard, badge: BADGE.teal },
  census: { icon: FileSpreadsheet, badge: BADGE.slate },
  reports: { icon: BarChart3, badge: BADGE.purple },
  users: { icon: Users, badge: BADGE.fuchsia },
  settings: { icon: Settings, badge: BADGE.slate },
  school: { icon: School, badge: BADGE.indigo },
  security: { icon: ShieldCheck, badge: BADGE.indigo },
};
