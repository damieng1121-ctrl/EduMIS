import Link from "next/link";

const features = [
  {
    title: "Pupil records",
    body: "One record per pupil — contacts, guardians, form group, SEND status, and history — kept in sync across every module.",
  },
  {
    title: "Attendance & registers",
    body: "AM/PM registers with DfE statutory codes, so attendance data is always census-ready.",
  },
  {
    title: "Behaviour & welfare",
    body: "Log incidents and achievements, track SEND plans, and keep safeguarding-sensitive records visible only to the right staff.",
  },
  {
    title: "Assessment & targets",
    body: "Record attainment by subject and term, and track pupil targets through to completion.",
  },
  {
    title: "Parents' evenings & messaging",
    body: "Publish appointment slots for guardians to book, and send targeted messages to parents by year group, form, or pupil.",
  },
  {
    title: "Multi-tenant by design",
    body: "Every school (or trust) is fully isolated: its own users, pupils, and records, on one shared platform.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">E</span>
            EduMIS
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Built for UK primary schools
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            One school management system for every school in your trust
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Pupils, attendance, behaviour, SEND, assessment, and parent communication — a fully multi-tenant
            MIS purpose-built for primary schools, with Google SSO and a dedicated parent portal.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="rounded-md bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
            >
              Sign in with Google
            </Link>
            <a
              href="#features"
              className="rounded-md border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-100"
            >
              See what&apos;s included
            </a>
          </div>
        </section>

        <section id="features" className="border-t border-slate-200 bg-white py-16">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-700">
        EduMIS — a multi-tenant school management system for UK primary schools.
      </footer>
    </div>
  );
}
