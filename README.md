# EduMIS

A multi-tenant school management system (MIS) for UK primary schools: pupils, attendance,
behaviour & welfare (including SEND), assessment, school operations (meals, clubs, staff
records, interventions), parents' evenings, and a dedicated parent portal — with Google or
Microsoft SSO (or a password), Trust/Federation-aware multi-school access, and 2FA for staff.

This is a working MVP — the full data model, auth, and every MIS module below are
implemented end to end, runnable locally today via a one-click dev login with no external
credentials needed. Real OAuth credentials, a production deployment, and a few smaller
gaps are documented as next steps below.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **PostgreSQL** via **Prisma 6**
- **Auth.js (NextAuth v5)** with Google and Microsoft Entra ID providers (each restricted
  per-tenant by the school's SSO domain) plus an email+password fallback for staff
- **TOTP-based 2FA** (`otplib`), enforced as a second factor for elevated staff regardless
  of sign-in method
- A separate **parent portal** (`/parent`) using email + password sign-in (guardians have
  no school SSO account)

## Getting started

### Option A: plain Node (fastest iteration)

```bash
npm install
cp .env.example .env        # then fill in real values, see below
docker run --name edumis-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=edumis -p 5434:5432 -d postgres:16
npm run db:migrate          # creates tables
npm run db:seed             # seeds a demo school with pupils, staff, and parent accounts
npm run dev
```

Visit `http://localhost:3002`. **No SSO credentials set up yet?** `npm run dev` shows a
"Dev login (local only)" section on the sign-in page — one click to sign in as any
seeded demo user, no Google account needed. It only exists in `next dev` (see below),
so there's no risk of it shipping to a real deployment.

### Option B: Docker Compose (closer to production)

```bash
cp .env.example .env        # fill in AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, APP_ENCRYPTION_KEY at minimum
docker compose up --build
```

This builds the app image (see `Dockerfile`), starts Postgres, applies migrations on
container start (`docker-entrypoint.sh`), and serves the app at `http://localhost:3002`.
Set `SEED_ON_START=true` in `.env` to also load the demo school on first boot. To seed
manually against the compose stack instead: `docker compose exec app npx prisma db seed`.

Either way, SSO sign-in requires a real Google and/or Microsoft OAuth client — see
below — with the matching authorized redirect URI, and at least one `Tenant.domain` in
the database matching the email domain you sign in with (the seed script creates one:
`willowbrook-primary.sch.uk`). Or set a password via an admin invite and skip SSO
entirely — see **Authentication & 2FA** below.

### Required environment variables

See `.env.example` for the full list and generation commands. At minimum, for local dev:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Session encryption — `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth credentials from Google Cloud Console |
| `APP_ENCRYPTION_KEY` | Encrypts 2FA secrets at rest — `openssl rand -hex 32` |

Without real Google OAuth credentials, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` can stay
blank for now — use the dev login described below to sign in and explore the UI, then
come back and fill those in when you're ready to test real SSO.

## Multi-tenancy model

Every school is a `Tenant` row. All tenant-owned data (`Pupil`, `AttendanceRecord`,
`BehaviourIncident`, etc.) carries a `tenantId` foreign key. **Isolation is enforced in
application code, not the database**: every API route resolves `tenantId` from the
authenticated session (`src/lib/session.ts`) — never from a client-supplied value — so a
crafted request can't read another school's data. See `src/lib/tenancy.ts` for the
rationale and the (cosmetic, non-security) subdomain-routing helper.

## Authentication & 2FA

- Staff can sign in with **Google Workspace SSO, Microsoft Entra ID (Microsoft 365)
  SSO, or a password** — an account can use any combination once set up; none of these
  replace the others. SSO auto-provisioning is matched against each `Tenant.domain`
  (e.g. `willowbrook-primary.sch.uk`): the first person from a registered domain to sign
  in is auto-provisioned as `STAFF`. A `TENANT_ADMIN` promotes staff to `TENANT_ADMIN`
  from **Users**, and flags class teachers with `isTeacher` to grant MIS classroom
  access regardless of role.
- **Every staff/admin invite is domain-locked**: adding a `STAFF` or `TENANT_ADMIN` user
  (via **Users**, or the platform Users page) requires their email to be on that
  school's own registered domain — you can't add `someone@gmail.com` as a Willowbrook
  staff member. `SUPER_ADMIN`/`TRUST_ADMIN` are exempt (they aren't tied to a single
  school's domain to begin with).
- **Password sign-in for staff**: inviting a new user (any role) sends a one-time
  set-password link (`/set-password`, `src/lib/staff-invite.ts` — same
  issue/consume-token pattern as the parent flow below). Once set, that account can sign
  in with email + password at any time, alongside SSO — useful for a supply teacher
  without a school Google/Microsoft account, or simply as a non-SSO fallback.
- A platform-level `SUPER_ADMIN` allowlist is controlled by the
  `EDUMIS_SUPER_ADMIN_EMAILS` env var (comma-separated), for EduMIS's own staff, not tied
  to any school domain. A super admin gets a **Schools** page (`/portal/super-admin`) to
  onboard new schools (name, slug, Workspace domain, phase) and suspend existing ones —
  no more direct DB/seed-script access needed for this.
- 2FA (TOTP) is **mandatory for elevated staff** (`TENANT_ADMIN`, `TRUST_ADMIN`,
  `SUPER_ADMIN`) and optional for regular `STAFF`, regardless of which sign-in method
  they used to authenticate. An account required to enrol is redirected to
  **Account → Security** on every route except that page itself until they do —
  enforced both in `src/lib/auth.config.ts` (page-level redirect) and again in
  `src/lib/session.ts`'s `requireSession()` (API-level, so a direct API call can't skip
  it). Once enabled, 2FA can't be turned back off (`/api/auth/2fa/disable` rejects it).
- **Parents** sign in separately at `/parent/login` with email + password (set via
  `/parent/set-password`), never through SSO, and never share the staff 2FA requirement.
  There is no self-service sign-up anywhere in the product, for staff or parents —
  every account is provisioned by an admin (or, for staff, by domain-matched SSO
  auto-provisioning) — this is deliberate for a product holding pupil safeguarding data.
- **Dev login** (`src/lib/auth.ts`, the `dev-login` Credentials provider): sign in as any
  already-seeded user by email, no password or SSO account required. It's only added
  to the providers array when `NODE_ENV !== "production"` — `next build` + `next start`
  (including the Docker image) always run with `NODE_ENV=production`, so this is
  structurally absent from anything resembling a real deployment, not just hidden from
  the UI. It never creates a user, only signs into an existing row. Staff accounts
  signed in this way still go through the real mandatory-2FA flow — that part isn't
  bypassed.

### Setting up Google Identity Platform / OAuth

1. In the Google Cloud Console, create (or reuse) a project and enable **Identity
   Platform** (or, more simply, just the standard **Google Identity / OAuth consent
   screen** — Identity Platform is Google's managed layer on top of the same OAuth flow,
   and adds SAML/OIDC federation for schools using a different IdP, and centralized
   MFA policy if you want to enforce 2FA at the IdP level instead of/alongside the
   in-app TOTP here).
2. Create an OAuth 2.0 Client ID (Web application). Add authorized redirect URIs:
   - `http://localhost:3002/api/auth/callback/google` (dev)
   - `https://<your-domain>/api/auth/callback/google` (prod)
3. Put the client ID/secret in `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
4. Register each school as a `Tenant` row with its Google Workspace `domain` — either
   via `prisma/seed.ts`-style scripts or the **Schools** super-admin page.

### Setting up Microsoft Entra ID / Microsoft 365 SSO

1. In the [Azure Portal](https://portal.azure.com), go to **Microsoft Entra ID → App
   registrations → New registration**. Under "Supported account types", choose
   **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)**
   — this matches the Google setup above (work/school accounts from any organisation,
   no personal Microsoft accounts — `src/lib/auth.ts` pins the `organizations` issuer
   endpoint to enforce this regardless of what's chosen in the portal).
2. Add a redirect URI (platform: **Web**):
   - `http://localhost:3002/api/auth/callback/microsoft-entra-id` (dev)
   - `https://<your-domain>/api/auth/callback/microsoft-entra-id` (prod)
3. Under **Certificates & secrets**, create a new client secret.
4. Put the Application (client) ID and secret value in `.env` as `MICROSOFT_CLIENT_ID` /
   `MICROSOFT_CLIENT_SECRET`.
5. Same `Tenant.domain` registration as Google above — a school's Microsoft 365 domain
   and Google Workspace domain both just need to match `Tenant.domain` (a school
   realistically uses one or the other, but nothing stops registering both).

## What's implemented

- **Pupils** — one record per pupil: contacts, form group, year group, SEND status,
  pupil premium/FSM flags, and a full guardian list.
- **Attendance** — AM/PM registers using DfE statutory codes (`src/lib/attendance-codes.ts`),
  with persistent-absence (below 90%) tracking.
- **Behaviour & welfare** — incidents (achievement/concern/bullying/safeguarding) with
  points and confidentiality gating, accident/first-aid reports, and SEND plans.
- **Assessment** — attainment by subject/term, and pupil targets tracked to completion.
- **School operations** — meal registers, clubs and membership/waitlists, staff records
  (DBS, safeguarding training), and pastoral interventions with progress notes.
- **Parents' evenings** — events with bookable appointment slots per teacher.
- **Parent portal** (`/parent`) — guardians see their children's attendance, messages, and
  book parents' evening slots, signed in separately from the staff SSO flow.
- **Parent messaging** — staff send targeted messages by year group, form group, or pupil.
- **Reports** (`/portal/reports`) — attendance trend, behaviour points by category,
  assessment distribution, and a persistent-absence list.
- **Census readiness** (`/portal/census`) — a pre-flight check and CSV export ahead of a
  DfE school census return.
- Cross-tenant **platform administration** (`/portal/super-admin`) for onboarding schools
  and managing users across the whole platform.

## Project structure

```
prisma/schema.prisma       Data model (multi-tenant)
prisma/seed.ts             Demo school, staff, and pupil/MIS data
src/lib/auth.ts            Auth.js config (Google/Microsoft/credentials providers, Prisma adapter, tenant resolution)
src/lib/auth.config.ts     Edge-safe auth config used by middleware
src/lib/session.ts         Server-side session/tenant/role/MIS-access guards for API routes
src/lib/tenancy.ts         Tenant resolution helpers
src/lib/twofactor.ts       TOTP generation/verification
src/lib/crypto.ts          AES-256-GCM encryption for 2FA secrets at rest
src/lib/attendance-codes.ts DfE statutory attendance code mapping
src/app/api/                REST-ish API routes, all tenant/role-scoped server-side
src/app/portal/             The authenticated staff app (pupils, attendance, behaviour, admin)
src/app/parent/             The separate parent portal
```

## Deployment (Google Cloud)

The `Dockerfile` (`npm run build` + `npm start`, migrations applied on container start
by `docker-entrypoint.sh`) is written to run as-is on:

- **Cloud Run** for the app — `gcloud run deploy edumis --source . --region europe-west2`
  (or build with Cloud Build and deploy the image) will work directly against this
  Dockerfile. `PORT` is already handled (Cloud Run injects it; the entrypoint honors
  `$PORT` via `next start`).
- **Cloud SQL for PostgreSQL** as the database (`DATABASE_URL` via the Cloud SQL Auth
  Proxy sidecar or a private IP connection)
- **Secret Manager** for `AUTH_SECRET`, `APP_ENCRYPTION_KEY`, and the OAuth client secret,
  mounted as env vars into Cloud Run
- **Google Identity Platform** and/or **Microsoft Entra ID** for staff SSO, as described above
- A wildcard DNS record / Cloud Run domain mapping if you want true per-school
  subdomains (`{slug}.yourdomain.com`) — `src/lib/tenancy.ts` already resolves the
  subdomain, but tenancy is enforced by session, not subdomain, so this is optional.

Not yet wired in: an actual `cloudbuild.yaml`/CI pipeline that builds and deploys the
image automatically on push — today deploying is a manual `gcloud run deploy` (or
`docker compose up` locally, see above).

## Tenant branding & logo uploads

Files can be uploaded as a school's nav logo (`src/lib/storage.ts`). Storage defaults to
local disk (`UPLOAD_STORAGE_DIR`, gitignored) — fine for a single dev/demo instance, but
it won't survive a redeploy and won't work across multiple Cloud Run instances, so swap
it for a Cloud Storage-backed implementation before going to production (the function
interface — `saveTenantLogo`/`readUpload`/`deleteUpload` — is the only thing that needs
to change; nothing else references the filesystem directly). The logo is served through
an authenticated API route (`/api/tenant/logo`), never from `public/`.

## Email notifications

`src/lib/notifications/` is a small pluggable layer — SMTP if `SMTP_HOST` is set, console
logging in dev otherwise, silently disabled in production without SMTP configured. It's
platform-wide, not per-tenant (schools don't bring their own mail server).

## What's not built yet

- Per-tenant configurable notification triggers (e.g. attendance-threshold alerts to
  parents) — the notification layer exists but isn't wired to a scheduled job yet
- CI / `cloudbuild.yaml` for automatic Cloud Run deploys on push
- Swapping local-disk logo storage for Cloud Storage before a real deployment
