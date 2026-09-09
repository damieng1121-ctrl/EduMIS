"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
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
  ChevronDown,
  HelpCircle,
  BookOpen,
  Bandage,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { canAccessMis } from "@/lib/roles";
import type { FeatureKey } from "@/lib/features";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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

type NavGroup = {
  label: string;
  icon: LucideIcon;
  items: NavLink[];
};

type NavEntry = NavLink | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

// Admin/reporting links are tenant-scoped, so they only make sense for staff
// who actually belong to a school — a platform SUPER_ADMIN (who has no
// tenantId) sees "Schools" instead.
const nav: NavEntry[] = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, roles: null },
  {
    label: "Pupils & progress",
    icon: GraduationCap,
    items: [
      { href: "/portal/pupils", label: "Pupils", icon: GraduationCap, roles: null, requiresMis: true },
      { href: "/portal/attendance", label: "Attendance", icon: CalendarCheck, roles: null, requiresMis: true },
      { href: "/portal/behaviour", label: "Behaviour", icon: HeartHandshake, roles: null, requiresMis: true },
      { href: "/portal/send", label: "SEND", icon: ClipboardPlus, roles: null, requiresMis: true },
      { href: "/portal/first-aid", label: "First Aid", icon: Bandage, roles: null, requiresMis: true },
      { href: "/portal/assessment", label: "Assessment", icon: ClipboardList, roles: null, requiresMis: true },
      { href: "/portal/targets", label: "Targets", icon: Target, roles: null, requiresMis: true },
      { href: "/portal/interventions", label: "Interventions", icon: Target, roles: null, requiresMis: true },
    ],
  },
  {
    label: "School life",
    icon: PartyPopper,
    items: [
      { href: "/portal/clubs", label: "Clubs", icon: PartyPopper, roles: null, requiresMis: true },
      { href: "/portal/meals", label: "Meals", icon: Utensils, roles: null, requiresMis: true },
      { href: "/portal/parents-evenings", label: "Parents' evenings", icon: CalendarClock, roles: null, requiresMis: true },
      { href: "/portal/timetable", label: "Timetable", icon: CalendarDays, roles: null, requiresMis: true },
      { href: "/portal/messages", label: "Messages", icon: Send, roles: null, requiresMis: true },
    ],
  },
  {
    label: "Staff & admin",
    icon: IdCard,
    items: [
      { href: "/portal/staff", label: "Staff records", icon: IdCard, roles: ["TENANT_ADMIN"] },
      { href: "/portal/admin/cover", label: "Cover", icon: UserCog, roles: ["TENANT_ADMIN"] },
      { href: "/portal/admin/users", label: "Users", icon: Users, roles: ["TENANT_ADMIN"] },
      { href: "/portal/admin/audit-log", label: "Audit log", icon: History, roles: ["TENANT_ADMIN"] },
      { href: "/portal/scr", label: "Single Central Record", icon: ShieldAlert, roles: ["TENANT_ADMIN"], feature: "SCR" },
    ],
  },
  {
    label: "Compliance & reports",
    icon: FileSpreadsheet,
    items: [
      { href: "/portal/reports", label: "Reports", icon: BarChart3, roles: ["TENANT_ADMIN"] },
      { href: "/portal/census", label: "Census readiness", icon: FileSpreadsheet, roles: ["TENANT_ADMIN"] },
      { href: "/portal/ctf", label: "CTF exchange", icon: FileOutput, roles: ["TENANT_ADMIN"], feature: "CTF_EXCHANGE" },
      { href: "/portal/admin/admissions", label: "Admissions", icon: UserPlus, roles: ["TENANT_ADMIN"], feature: "ADMISSIONS" },
      { href: "/portal/admin/wonde", label: "Wonde", icon: Network, roles: ["TENANT_ADMIN"], feature: "WONDE" },
    ],
  },
  { href: "/portal/admin/settings", label: "Settings", icon: Settings, roles: ["TENANT_ADMIN"] },
  { href: "/portal/super-admin", label: "Schools", icon: School, roles: ["SUPER_ADMIN"] },
  { href: "/portal/trust-admin", label: "My Trust", icon: School, roles: ["TRUST_ADMIN"] },
];

/** Modules a school can hide entirely if they don't use them — see /portal/admin/settings. Core nav (dashboard/settings/users) always shows. */
export const TOGGLEABLE_NAV_ITEMS = [
  { href: "/portal/clubs", label: "Clubs" },
  { href: "/portal/meals", label: "Meals" },
] as const;

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@edumis.app";

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
  function visibleLinks(links: NavLink[]) {
    return links
      .filter((l) => !l.roles || (l.roles as readonly string[]).includes(role))
      .filter((l) => !l.requiresMis || (!isManagingNoSchool && canAccessMis(role, isTeacher)))
      .filter((l) => !l.feature || enabled.has(l.feature))
      .filter((l) => !disabled.has(l.href));
  }

  // Groups collapse to their single link when only one item survives
  // role/feature filtering, and disappear entirely when none do — no empty
  // or pointless one-click dropdowns.
  const visible: NavEntry[] = nav.flatMap((entry): NavEntry[] => {
    if (!isGroup(entry)) return visibleLinks([entry]);
    const items = visibleLinks(entry.items);
    if (items.length === 0) return [];
    if (items.length === 1) return items;
    return [{ ...entry, items }];
  });

  // A school's brand color (set in Settings) accents the active link/group
  // instead of the whole bar, since the bar itself is now a fixed white
  // top / black menu design.
  const accentStyle = sidebarColor ? { backgroundColor: sidebarColor } : undefined;

  return (
    <header className="sticky top-0 z-20 shadow-sm print:hidden">
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- small admin-uploaded logo, not worth next/image's remote-loader setup
              <img src="/api/tenant/logo" alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
            ) : (
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-sm font-semibold text-white"
                style={accentStyle}
              >
                {appName.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 leading-tight">
              <p className="truncate font-semibold text-slate-900 dark:text-white">{appName}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{tenantName}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <HelpMenu />
            <ThemeToggle className="flex items-center justify-center rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" />
            <Link
              href="/portal/account/security"
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <UserIcon size={16} className="shrink-0" />
              <span className="hidden max-w-[10rem] truncate sm:inline">{userName}</span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <LogOut size={16} className="shrink-0" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>

      <nav className="bg-slate-900 dark:bg-black">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-1 px-4 py-2">
          {visible.map((entry) =>
            isGroup(entry) ? (
              <NavDropdown key={entry.label} group={entry} pathname={pathname} accentStyle={accentStyle} />
            ) : (
              <NavItem key={entry.href} link={entry} pathname={pathname} accentStyle={accentStyle} />
            ),
          )}
        </div>
      </nav>
    </header>
  );
}

function isActive(href: string, pathname: string) {
  return href === "/portal" ? pathname === href : pathname.startsWith(href);
}

function NavItem({
  link,
  pathname,
  accentStyle,
}: {
  link: NavLink;
  pathname: string;
  accentStyle?: { backgroundColor: string };
}) {
  const active = isActive(link.href, pathname);
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      className={clsx(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-indigo-500 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white",
      )}
      style={active ? accentStyle : undefined}
    >
      <Icon size={15} className="shrink-0" />
      {link.label}
    </Link>
  );
}

function NavDropdown({
  group,
  pathname,
  accentStyle,
}: {
  group: NavGroup;
  pathname: string;
  accentStyle?: { backgroundColor: string };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const groupActive = group.items.some((l) => isActive(l.href, pathname));
  const Icon = group.icon;

  // Close the dropdown once navigation lands on one of its links. Adjusting
  // state during render (comparing against the pathname seen last render)
  // rather than in a useEffect avoids an extra post-navigation render pass —
  // see https://react.dev/reference/react/useState#storing-information-from-previous-renders.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={clsx(
          "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
          groupActive ? "bg-indigo-500 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white",
        )}
        style={groupActive ? accentStyle : undefined}
      >
        <Icon size={15} className="shrink-0" />
        {group.label}
        <ChevronDown size={14} className={clsx("shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[13rem] rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {group.items.map((l) => {
            const active = isActive(l.href, pathname);
            const ItemIcon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700",
                )}
              >
                <ItemIcon size={15} className="shrink-0" />
                {l.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HelpMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Help & support"
        aria-label="Help & support"
        className="flex items-center justify-center rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <HelpCircle size={16} className="shrink-0" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <p className="font-medium text-slate-900 dark:text-white">Need a hand?</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Browse the help guides, or email support if you&apos;re still stuck.
          </p>
          <Link
            href="/portal/help"
            className="mt-3 flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <BookOpen size={14} className="shrink-0" />
            Help guides
          </Link>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-2 flex items-center gap-2 rounded-md bg-indigo-500 px-3 py-2 font-medium text-white transition-colors hover:bg-indigo-600"
          >
            <Mail size={14} className="shrink-0" />
            {SUPPORT_EMAIL}
          </a>
        </div>
      )}
    </div>
  );
}
