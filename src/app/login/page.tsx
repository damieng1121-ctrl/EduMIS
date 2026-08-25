"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginError() {
  const params = useSearchParams();
  const error = params.get("error");
  if (!error) return null;
  return (
    <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
      {error === "AccessDenied"
        ? "Your account's domain isn't registered to an EduMIS school yet. Ask your school's IT admin to set this up, or contact us."
        : "Something went wrong signing you in. Please try again."}
    </p>
  );
}

function PasswordLogin() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("staff-login", { email, password, callbackUrl: "/portal", redirect: false });
      if (!res || res.error) {
        setError("Incorrect email or password.");
        return;
      }
      window.location.href = res.url ?? "/portal";
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        Sign in with email and password instead
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3 text-left">
      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-slate-600">
        Only works for accounts that have set a password (via a set-password link from an admin invite).
      </p>
    </form>
  );
}

// Mirrors the server-side gate in src/lib/auth.ts — the "dev-login" provider
// only exists in the providers array outside a production build, so this is
// purely a UI convenience, not the actual security boundary.
const DEV_LOGIN_ENABLED = process.env.NODE_ENV !== "production";

const DEV_ACCOUNTS = [
  { email: "superadmin@edumis.dev", label: "EduMIS Platform — Super Admin" },
  { email: "admin@willowbrook-primary.sch.uk", label: "Priya Shah — Tenant Admin (standalone school)" },
  { email: "j.taylor@willowbrook-primary.sch.uk", label: "Jamie Taylor — Staff (teacher)" },
  { email: "federation.head@two-rivers-federation.org", label: "Morgan Reyes — Trust Admin (2-school Federation)" },
  { email: "ceo@oaklearningtrust.org", label: "Dr Amara Osei — Trust Admin (3-school MAT)" },
];

function DevLogin() {
  if (!DEV_LOGIN_ENABLED) return null;
  return (
    <div className="mt-6 border-t border-slate-200 pt-6 text-left">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
        Dev login (local only — no SSO needed)
      </p>
      <p className="mt-1 text-xs text-slate-700">
        Requires the seed script to have run. Admins will still be prompted to set up 2FA —
        that part of the real flow isn&apos;t skipped.
      </p>
      <div className="mt-3 space-y-2">
        {DEV_ACCOUNTS.map((a) => (
          <button
            key={a.email}
            onClick={() => signIn("dev-login", { email: a.email, callbackUrl: "/portal" })}
            className="block w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            {a.label}
            <span className="block text-xs text-slate-600">{a.email}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-white px-6 py-16">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 font-semibold text-white shadow-sm">
          E
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Sign in to EduMIS</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use your school&apos;s Google or Microsoft account. Admins will also be asked for a
          second factor.
        </p>
        <div className="mt-6 space-y-2">
          <button
            onClick={() => signIn("google", { callbackUrl: "/portal" })}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            <GoogleIcon />
            Sign in with Google
          </button>
          <button
            onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/portal" })}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            <MicrosoftIcon />
            Sign in with Microsoft
          </button>
        </div>
        <PasswordLogin />
        <Suspense fallback={null}>
          <LoginError />
        </Suspense>
        <DevLogin />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022" />
      <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00" />
      <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF" />
      <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900" />
    </svg>
  );
}
