import Link from "next/link";
import { requireParentSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function ParentDashboardPage() {
  const session = await requireParentSession();

  const [links, unreadCount, upcomingSlot] = await Promise.all([
    prisma.pupilGuardian.findMany({
      where: { tenantId: session.user.tenantId, guardianId: session.user.id },
      orderBy: { priorityOrder: "asc" },
      include: {
        pupil: {
          select: { id: true, firstName: true, lastName: true, preferredName: true, yearGroup: true, formGroup: { select: { name: true } } },
        },
      },
    }),
    prisma.parentMessageRecipient.count({
      where: { tenantId: session.user.tenantId, guardianId: session.user.id, readAt: null },
    }),
    prisma.appointmentSlot.findFirst({
      where: { tenantId: session.user.tenantId, guardianId: session.user.id, status: "BOOKED", startTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
      include: { teacher: { select: { name: true, email: true } }, pupil: { select: { firstName: true, lastName: true } }, event: { select: { title: true, locationNote: true } } },
    }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Welcome back{session.user.name ? `, ${session.user.name}` : ""}</h1>
        <Link
          href="/parent/report-absence"
          className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
        >
          Report an absence
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">Unread messages</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{unreadCount}</p>
          <Link href="/parent/messages" className="mt-2 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400">View messages</Link>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-400">Next booked appointment</p>
          {upcomingSlot ? (
            <div className="mt-2">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {upcomingSlot.event.title} — {upcomingSlot.pupil?.firstName} {upcomingSlot.pupil?.lastName}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {new Date(upcomingSlot.startTime).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} with {upcomingSlot.teacher.name ?? upcomingSlot.teacher.email}
              </p>
              {upcomingSlot.event.locationNote && <p className="text-xs text-slate-600 dark:text-slate-400">{upcomingSlot.event.locationNote}</p>}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">No upcoming appointments booked.</p>
          )}
          <Link href="/parent/parents-evenings" className="mt-2 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400">View parents&apos; evenings</Link>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900 dark:text-white">Your children</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link
            key={l.pupil.id}
            href={`/parent/children/${l.pupil.id}`}
            className="rounded-md border border-slate-200 bg-white p-5 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="font-medium text-slate-900 dark:text-white">{l.pupil.preferredName || l.pupil.firstName} {l.pupil.lastName}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {l.pupil.yearGroup.replace("_", " ")}
              {l.pupil.formGroup ? ` · ${l.pupil.formGroup.name}` : ""}
            </p>
          </Link>
        ))}
        {links.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-400">No children are linked to your account yet.</p>}
      </div>
    </div>
  );
}
