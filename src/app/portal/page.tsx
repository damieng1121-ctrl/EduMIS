import Link from "next/link";
import { GraduationCap, CalendarCheck, HeartHandshake, CalendarClock } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessMis } from "@/lib/roles";
import { isAttendedSession } from "@/lib/attendance-codes";

function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: typeof GraduationCap;
  color: "blue" | "green" | "indigo" | "red";
}) {
  const badgeStyles = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    indigo: "bg-indigo-500",
    red: "bg-red-500",
  }[color];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-600">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${badgeStyles} text-white`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-600">{caption}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId;

  if (!tenantId) {
    const tenantCount = await prisma.tenant.count();
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Platform admin</h1>
        <p className="mt-2 text-slate-600">
          You&apos;re signed in as an EduMIS platform administrator. School portal features (pupils,
          attendance, behaviour) are scoped per-tenant, so there&apos;s nothing school-specific to show
          here — manage schools from{" "}
          <Link href="/portal/super-admin" className="text-indigo-600 hover:underline">
            Schools
          </Link>
          .
        </p>
        <p className="mt-4 text-sm text-slate-700">{tenantCount} school{tenantCount === 1 ? "" : "s"} onboarded.</p>
      </div>
    );
  }

  if (!canAccessMis(session!.user.role, session!.user.isTeacher)) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Welcome, {session!.user.name ?? session!.user.email}. This account doesn&apos;t have MIS
          classroom access — contact your school admin if you believe this is wrong.
        </p>
      </div>
    );
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const [activePupils, todayAttendance, recentIncidents, upcomingEvent] = await Promise.all([
    prisma.pupil.count({ where: { tenantId, isActive: true, isDeleted: false } }),
    prisma.attendanceRecord.findMany({
      where: { tenantId, date: { gte: startOfToday, lte: endOfToday }, mark: { not: "NOT_RECORDED" } },
      select: { mark: true },
    }),
    prisma.behaviourIncident.findMany({
      where: { tenantId, isConfidential: false },
      select: { id: true, category: true, description: true, date: true, pupil: { select: { firstName: true, lastName: true } } },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.parentsEveningEvent.findFirst({
      where: { tenantId, date: { gte: startOfToday } },
      orderBy: { date: "asc" },
      select: { id: true, title: true, date: true },
    }),
  ]);

  const attendedToday = todayAttendance.filter((r) => isAttendedSession(r.mark)).length;
  const attendancePct = todayAttendance.length ? Math.round((attendedToday / todayAttendance.length) * 100) : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active pupils"
          value={activePupils}
          caption="Currently on roll"
          icon={GraduationCap}
          color="blue"
        />
        <StatCard
          label="Today's attendance"
          value={attendancePct === null ? "—" : `${attendancePct}%`}
          caption={todayAttendance.length ? `${attendedToday} of ${todayAttendance.length} sessions so far` : "No registers taken yet today"}
          icon={CalendarCheck}
          color="green"
        />
        <StatCard
          label="Recent behaviour"
          value={recentIncidents.length}
          caption="Incidents logged recently"
          icon={HeartHandshake}
          color="indigo"
        />
        <StatCard
          label="Next parents' evening"
          value={upcomingEvent ? upcomingEvent.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
          caption={upcomingEvent ? upcomingEvent.title : "None scheduled"}
          icon={CalendarClock}
          color="red"
        />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent behaviour incidents</h2>
          <Link href="/portal/behaviour" className="text-sm text-indigo-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {recentIncidents.length === 0 && <p className="p-5 text-sm text-slate-700">No incidents logged yet.</p>}
          {recentIncidents.map((i) => (
            <div key={i.id} className="p-4">
              <p className="font-medium text-slate-900">
                {i.pupil.firstName} {i.pupil.lastName} — {i.category.charAt(0) + i.category.slice(1).toLowerCase()}
              </p>
              <p className="mt-0.5 text-sm text-slate-600">{i.description}</p>
              <p className="mt-1 text-xs text-slate-500">{i.date.toLocaleDateString("en-GB")}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
