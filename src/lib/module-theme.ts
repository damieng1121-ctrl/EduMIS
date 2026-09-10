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
  FileOutput,
  ShieldAlert,
  Network,
  Puzzle,
  History,
  UserPlus,
  CalendarDays,
  UserCog,
  Bandage,
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
  | "security"
  | "ctf"
  | "scr"
  | "features"
  | "wonde"
  | "audit-log"
  | "admissions"
  | "timetable"
  | "cover"
  | "first-aid";

/**
 * Literal (never interpolated) Tailwind classes — required for the JIT
 * compiler to pick them up. Tinted background + matching icon color (not a
 * solid saturated fill with a white icon) — reads as a normal enterprise
 * app rather than a default AI-generated palette.
 */
const BADGE = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  pink: "bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400",
  lime: "bg-lime-50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-400",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  teal: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  fuchsia: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400",
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
  ctf: { icon: FileOutput, badge: BADGE.cyan },
  scr: { icon: ShieldAlert, badge: BADGE.rose },
  features: { icon: Puzzle, badge: BADGE.violet },
  wonde: { icon: Network, badge: BADGE.orange },
  "audit-log": { icon: History, badge: BADGE.slate },
  admissions: { icon: UserPlus, badge: BADGE.sky },
  timetable: { icon: CalendarDays, badge: BADGE.teal },
  cover: { icon: UserCog, badge: BADGE.fuchsia },
  "first-aid": { icon: Bandage, badge: BADGE.rose },
};
