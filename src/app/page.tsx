import Link from "next/link";
import {
  GraduationCap,
  CalendarCheck,
  HeartHandshake,
  ClipboardList,
  CalendarClock,
  Building2,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    title: "Pupil records",
    body: "One record per pupil — contacts, guardians, form group, SEND status, and history — kept in sync across every module.",
    icon: GraduationCap,
  },
  {
    title: "Attendance & registers",
    body: "AM/PM registers with DfE statutory codes, so attendance data is always census-ready.",
    icon: CalendarCheck,
  },
  {
    title: "Behaviour & welfare",
    body: "Log incidents and achievements, track SEND plans, and keep safeguarding-sensitive records visible only to the right staff.",
    icon: HeartHandshake,
  },
  {
    title: "Assessment & targets",
    body: "Record attainment by subject and term, and track pupil targets through to completion.",
    icon: ClipboardList,
  },
  {
    title: "Parents' evenings & messaging",
    body: "Publish appointment slots for guardians to book, and send targeted messages to parents by year group, form, or pupil.",
    icon: CalendarClock,
  },
  {
    title: "Multi-tenant by design",
    body: "Every school (or trust) is fully isolated: its own users, pupils, and records, on one shared platform.",
    icon: Building2,
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white" style={{ colorScheme: "light" }}>
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
              E
            </span>
            EduMIS
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="font-medium text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-[32rem] w-[64rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-200 via-violet-200 to-sky-200 opacity-40 blur-3xl"
          />
          <div className="relative mx-auto max-w-6xl px-6 py-24 text-center sm:py-28">
            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-indigo-700">
              Built for UK primary schools
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              One school management system for{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                every school
              </span>{" "}
              in your trust
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Pupils, attendance, behaviour, SEND, assessment, and parent communication — a fully multi-tenant
              MIS purpose-built for primary schools, with Google SSO and a dedicated parent portal.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-3 font-medium text-white shadow-md shadow-indigo-600/20 transition-colors hover:bg-indigo-700"
              >
                Sign in with Google
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#features"
                className="rounded-md border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                See what&apos;s included
              </a>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-slate-200 bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Everything a school office needs</h2>
              <p className="mt-3 text-slate-600">Six modules, one login, zero spreadsheets.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                    <f.icon size={20} />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-gradient-to-br from-indigo-600 to-violet-600 py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <h2 className="text-2xl font-bold text-white">Ready to see it in action?</h2>
              <p className="mt-2 text-indigo-100">Sign in with your school&apos;s Google Workspace account to get started.</p>
            </div>
            <Link
              href="/login"
              className="shrink-0 rounded-md bg-white px-6 py-3 font-medium text-indigo-700 shadow-md transition-colors hover:bg-indigo-50"
            >
              Sign in with Google
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-600">
        EduMIS — a multi-tenant school management system for UK primary schools.
      </footer>
    </div>
  );
}
