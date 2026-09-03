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
  | "admissions";

/**
 * Literal (never interpolated) Tailwind classes — required for the JIT
 * compiler to pick them up. The 400 shade reads noticeably lighter/warmer
 * than the previous 500 while staying dark enough for a white icon on top.
 */
const BADGE = {
  indigo: "bg-indigo-400",
  blue: "bg-blue-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  violet: "bg-violet-400",
  cyan: "bg-cyan-400",
  rose: "bg-rose-400",
  orange: "bg-orange-400",
  pink: "bg-pink-400",
  lime: "bg-lime-400",
  sky: "bg-sky-400",
  teal: "bg-teal-400",
  slate: "bg-slate-400",
  purple: "bg-purple-400",
  fuchsia: "bg-fuchsia-400",
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
};
