"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import { LayoutDashboard, Mail, CalendarClock, PartyPopper, CalendarOff, User as UserIcon, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const links = [
  { href: "/parent", label: "Home", icon: LayoutDashboard },
  { href: "/parent/messages", label: "Messages", icon: Mail },
  { href: "/parent/parents-evenings", label: "Parents' evenings", icon: CalendarClock },
  { href: "/parent/clubs", label: "Clubs", icon: PartyPopper },
  { href: "/parent/report-absence", label: "Report an absence", icon: CalendarOff },
];

export function ParentNav({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 shadow-sm print:hidden">
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-sm font-semibold text-white">E</span>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-semibold text-slate-900 dark:text-white">EduMIS</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">Parent portal</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle className="flex items-center justify-center rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" />
            <span className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
              <UserIcon size={16} className="shrink-0" />
              <span className="hidden max-w-[10rem] truncate sm:inline">{userName}</span>
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/parent/login" })}
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
          {links.map((l) => {
            const active = l.href === "/parent" ? pathname === l.href : pathname.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-indigo-500 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon size={15} className="shrink-0" />
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
