"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import clsx from "clsx";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  School,
  User as UserIcon,
  LogOut,
  GraduationCap,
  CalendarCheck,
  HeartHandshake,
  ClipboardList,
  Target,
  PartyPopper,
  Utensils,
  IdCard,
  ClipboardPlus,
  CalendarClock,
  Send,
  FileSpreadsheet,
  FileOutput,
  ShieldAlert,
  Network,
  History,
  UserPlus,
  CalendarDays,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { canAccessMis } from "@/lib/roles";
import type { FeatureKey } from "@/lib/features";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: readonly string[] | null;
  /** MIS links are additionally gated by canAccessMis(role, isTeacher) on top of `roles`. */
  requiresMis?: boolean;
  /** Optional-module links only show once the tenant has this feature switched on from Super Admin. */
  feature?: FeatureKey;
};

// Admin/reporting links are tenant-scoped, so they only make sense for staff
// who actually belong to a school — a platform SUPER_ADMIN (who has no
// tenantId) sees "Schools" instead.
const links: NavLink[] = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, roles: null },
  { href: "/portal/pupils", label: "Pupils", icon: GraduationCap, roles: null, requiresMis: true },
  { href: "/portal/attendance", label: "Attendance", icon: CalendarCheck, roles: null, requiresMis: true },
  { href: "/portal/behaviour", label: "Behaviour", icon: HeartHandshake, roles: null, requiresMis: true },
  { href: "/portal/send", label: "SEND", icon: ClipboardPlus, roles: null, requiresMis: true },
  { href: "/portal/assessment", label: "Assessment", icon: ClipboardList, roles: null, requiresMis: true },
  { href: "/portal/targets", label: "Targets", icon: Target, roles: null, requiresMis: true },
  { href: "/portal/interventions", label: "Interventions", icon: Target, roles: null, requiresMis: true },
  { href: "/portal/clubs", label: "Clubs", icon: PartyPopper, roles: null, requiresMis: true },
  { href: "/portal/meals", label: "Meals", icon: Utensils, roles: null, requiresMis: true },
  { href: "/portal/parents-evenings", label: "Parents' evenings", icon: CalendarClock, roles: null, requiresMis: true },
  { href: "/portal/messages", label: "Messages", icon: Send, roles: null, requiresMis: true },
  { href: "/portal/timetable", label: "Timetable", icon: CalendarDays, roles: null, requiresMis: true },
  { href: "/portal/staff", label: "Staff records", icon: IdCard, roles: ["TENANT_ADMIN"] },
  { href: "/portal/scr", label: "Single Central Record", icon: ShieldAlert, roles: ["TENANT_ADMIN"], feature: "SCR" },
  { href: "/portal/ctf", label: "CTF exchange", icon: FileOutput, roles: ["TENANT_ADMIN"], feature: "CTF_EXCHANGE" },
  { href: "/portal/census", label: "Census readiness", icon: FileSpreadsheet, roles: ["TENANT_ADMIN"] },
  { href: "/portal/reports", label: "Reports", icon: BarChart3, roles: ["TENANT_ADMIN"] },
  { href: "/portal/admin/users", label: "Users", icon: Users, roles: ["TENANT_ADMIN"] },
  { href: "/portal/admin/cover", label: "Cover", icon: UserCog, roles: ["TENANT_ADMIN"] },
  { href: "/portal/admin/audit-log", label: "Audit log", icon: History, roles: ["TENANT_ADMIN"] },
  { href: "/portal/admin/wonde", label: "Wonde", icon: Network, roles: ["TENANT_ADMIN"], feature: "WONDE" },
  { href: "/portal/admin/admissions", label: "Admissions", icon: UserPlus, roles: ["TENANT_ADMIN"], feature: "ADMISSIONS" },
  { href: "/portal/admin/settings", label: "Settings", icon: Settings, roles: ["TENANT_ADMIN"] },
  { href: "/portal/super-admin", label: "Schools", icon: School, roles: ["SUPER_ADMIN"] },
  { href: "/portal/trust-admin", label: "My Trust", icon: School, roles: ["TRUST_ADMIN"] },
];

/** Modules a school can hide entirely if they don't use them — see /portal/admin/settings. Core nav (dashboard/settings/users) always shows. */
export const TOGGLEABLE_NAV_ITEMS = [
  { href: "/portal/clubs", label: "Clubs" },
  { href: "/portal/meals", label: "Meals" },
] as const;

/** Default nav bar background is a brand gradient — a school can override it with a flat colour of its own in Settings. */
const DEFAULT_BAR_STYLE = { backgroundImage: "linear-gradient(to right, #6366f1, #8b5cf6)" };

export function PortalNav({
  role,
  userName,
  tenantName,
  appName = "EduMIS",
  hasLogo = false,
  sidebarColor,
  disabledNavItems = [],
  enabledFeatures = [],
  isTeacher = false,
}: {
  role: Role;
  userName: string;
  tenantName: string;
  appName?: string;
  hasLogo?: boolean;
  sidebarColor?: string | null;
  disabledNavItems?: string[];
  enabledFeatures?: string[];
  isTeacher?: boolean;
}) {
  const pathname = usePathname();
  const disabled = new Set(disabledNavItems);
  const enabled = new Set(enabledFeatures);

  // A platform/Trust admin only gets a real tenantId (and this component's
  // `role` prop gets remapped to "TENANT_ADMIN") while actively managing one
  // school — see portal/layout.tsx. So a bare "SUPER_ADMIN"/"TRUST_ADMIN"
  // here always means "not currently managing any school", even though
  // canAccessMis() would otherwise allow it platform-wide. Without this,
  // MIS tabs (Pupils, Attendance, ...) show in the nav with nothing to
  // scope them to, and every fetch on those pages 403s.
  const isManagingNoSchool = role === "SUPER_ADMIN" || role === "TRUST_ADMIN";
  const visible = links
    .filter((l) => !l.roles || (l.roles as readonly string[]).includes(role))
    .filter((l) => !l.requiresMis || (!isManagingNoSchool && canAccessMis(role, isTeacher)))
    .filter((l) => !l.feature || enabled.has(l.feature))
    .filter((l) => !disabled.has(l.href));

  const barStyle = sidebarColor ? { backgroundColor: sidebarColor } : DEFAULT_BAR_STYLE;

  return (
    <header className="sticky top-0 z-20 shadow-md print:hidden" style={barStyle}>
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- small admin-uploaded logo, not worth next/image's remote-loader setup
            <img src="/api/tenant/logo" alt="" className="h-8 w-8 shrink-0 rounded-lg bg-white/10 object-contain" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-sm font-semibold text-white backdrop-blur">
              {appName.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate font-semibold text-white">{appName}</p>
            <p className="truncate text-xs text-white/70">{tenantName}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/portal/account/security"
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/15 hover:text-white"
          >
            <UserIcon size={16} className="shrink-0" />
            <span className="hidden max-w-[10rem] truncate sm:inline">{userName}</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          >
            <LogOut size={16} className="shrink-0" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      <nav className="border-t border-white/10 bg-black/10">
        <div className="mx-auto flex max-w-[1600px] flex-wrap gap-1 px-4 py-2">
          {visible.map((l) => (
            <NavItem key={l.href} link={l} pathname={pathname} />
          ))}
        </div>
      </nav>
    </header>
  );
}

function NavItem({ link, pathname }: { link: NavLink; pathname: string }) {
  const active = link.href === "/portal" ? pathname === link.href : pathname.startsWith(link.href);
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      className={clsx(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-white text-indigo-700 shadow-sm" : "text-white/80 hover:bg-white/15 hover:text-white",
      )}
    >
      <Icon size={15} className="shrink-0" />
      {link.label}
    </Link>
  );
}
