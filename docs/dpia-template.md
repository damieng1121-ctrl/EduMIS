# Data Protection Impact Assessment (DPIA) — EduMIS

> **This is a starting-point template only.** It was generated to help structure the
> assessment and to ground it in what this codebase actually does — it is **not legal
> advice**, it has **not been reviewed by a solicitor or a qualified Data Protection
> Officer**, and no real deployment of this system holding real children's data should go
> live until a qualified DPO (working with the school's leadership and safeguarding lead)
> has reviewed, corrected, and completed every section below, and formally signed it off.
> Anywhere this template says "consult the DPO" or leaves a section blank, that step is
> mandatory, not optional.

---

## Document control

| | |
|---|---|
| System name | EduMIS (school management information system) |
| Assessment prepared by | *[name / role]* |
| Date prepared | *[date]* |
| Reviewed by (DPO) | *[name — not yet completed]* |
| Review date | *[date]* |
| Status | **Draft — pending DPO review** |

---

## Step 1: Identify the need for a DPIA

A DPIA is required here, not optional. This system:

- Processes **special category data** under UK GDPR Article 9 — SEND status and plans,
  safeguarding-flagged behaviour incidents, medical notes, and staff vetting/DBS data —
  about children, a recognised vulnerable group.
- Involves **systematic monitoring** of individuals at scale — attendance registers,
  behaviour points, assessment results, and an audit trail of staff access to pupil
  records, all tracked per pupil/per staff member over time.
- Involves **new technology / novel data flows** for the organisation deploying it —
  SSO-based identity, a third-party roster-sync integration (Wonde), and structured
  data exchange with other schools (CTF import/export).
- Processes data about children, who the ICO explicitly calls out as requiring
  particular protection since they may be less aware of the risks involved.

Any one of these triggers a mandatory DPIA under ICO guidance; this system has all four.

## Step 2: Describe the processing

### Purpose

EduMIS is the day-to-day management information system for a UK primary school:
recording and managing pupil records, attendance, behaviour and welfare (including SEND),
assessment, school operations (meals, clubs, staff records, interventions), parents'
evenings, and parent-facing communication, across one school or a small Trust/Federation
of schools.

### Nature of the processing

Data is entered and viewed by school staff (teachers, admin, SENCO, senior leadership)
through a web application, and by parents/guardians through a separate parent portal.
Processing includes:

- Creating, viewing, and updating pupil, staff, and guardian records
- Recording day-to-day events (attendance marks, behaviour incidents, meal choices,
  assessment results, accident reports, SEND plan reviews, staff vetting checks)
- Producing reports and statutory-return-adjacent exports (DfE school census pre-flight
  checks, Common Transfer File (CTF) exports/imports when a pupil moves school)
- Sending messages (email, and SMS where configured) from staff to parents/guardians
- Optionally syncing roster data from a third-party service (Wonde), where a school
  chooses to connect it
- Recording an audit trail of who accessed or changed which record, and when

### Scope

- **Data subjects**: pupils, their parents/guardians, and school staff (teaching and
  non-teaching), all scoped to one school (`Tenant`) at a time, with application-level
  (not database-level) isolation between tenants — see `src/lib/tenancy.ts`.
- **Volume**: a typical UK primary school's full roll — commonly a few hundred pupils,
  their guardians, and school staff, per tenant.
- **Categories of personal data processed** (drawn directly from `prisma/schema.prisma`):
  - **Pupil**: name, preferred name, DOB, gender, UPN, ethnicity, home language,
    nationality, home address, SEND status, pupil premium/FSM eligibility, EYFS profile
    scores, admission/leaving dates, **free-text medical notes**, and a photo reference.
  - **SendPlan**: SEND primary need, free-text description, targets, and external
    agencies involved — special category data by nature.
  - **BehaviourIncident**: category (including `SAFEGUARDING` and `BULLYING`), free-text
    description and action taken, with a confidentiality flag restricting visibility to
    admins and the designated safeguarding lead.
  - **AccidentReport**: injury details, severity, first-aider identity.
  - **PupilGuardian**: relationship, parental responsibility, contact/collection
    permissions, linked to a guardian's `User` record (name, email, phone).
  - **StaffProfile**: DBS check date/number, and the fuller set of KCSIE Single Central
    Record fields — identity check, right-to-work evidence, barred-list check,
    prohibition-from-teaching check, references, overseas checks.
  - **User**: name, email, role, and (for elevated staff) a TOTP two-factor secret.
  - **ParentMessage**: message content sent to guardians, optionally flagged as an SMS
    "urgent" alert (attendance/safeguarding-grade).
  - **CtfExchange**: a record (not the full payload) of pupil data leaving the school via
    CTF export, or entering it via import, to/from another school.
  - **WondeConnection**: an encrypted third-party API token, where a school has chosen to
    connect the Wonde roster-sync integration.
  - **AuditLog**: who accessed/changed which record, when, and (for updates) which
    fields — deliberately not the field values themselves.

### Context

- Data subjects are children and their families, in a relationship of trust and
  dependency with the school — they have limited practical ability to object to how the
  school processes their data through this system.
- Staff sign in via Google Workspace or Microsoft Entra ID SSO (school-domain-restricted)
  or a password fallback, with mandatory TOTP 2FA for admin-level roles. Parents sign in
  separately with email + password, with no SSO and no self-service sign-up for anyone —
  every account is provisioned by an admin or matched SSO domain.
- Multiple schools (`Tenant`s) can share one deployment; a Trust/Federation admin may
  have cross-school access within their own Trust. Tenant isolation is enforced in
  application code (every query scoped server-side to `session.user.tenantId`), not by
  separate databases per school.

## Step 3: Consultation process

Before this DPIA can be signed off, the following should be consulted and their input
recorded:

- The school's (or Trust's) **Data Protection Officer** — mandatory for a public
  authority processing children's data.
- The **designated safeguarding lead** — for the safeguarding-flagged behaviour,
  SEND, and accident-report data specifically.
- **School senior leadership / the data controller's representative** — accountable for
  the processing overall.
- Where practical, **parent/guardian representatives** — on the parent portal and
  parent-messaging features specifically, since those are the parts of the system
  parents interact with directly.
- The **hosting/infrastructure provider** — to confirm where data is actually stored and
  what safeguards apply there (see Step 4 and the DPA template alongside this document).

*[Record who was actually consulted, when, and a summary of their input here.]*

## Step 4: Assess necessity and proportionality

*[To be completed by the DPO alongside school leadership. Prompts to work through:]*

- Is each category of data collected actually necessary for the stated purpose, or is
  something collected "just in case"? (E.g. `medicalNotes` and `ethnicity` are free-text/
  optional fields — is their collection justified and minimised in practice at this
  school?)
- Is the lawful basis for each category of processing clear (typically public task /
  legal obligation for core pupil records; consent or legitimate interests for optional
  extras like SMS alerts)?
- Are data subjects (parents, and pupils where age-appropriate) given clear privacy
  information about what's collected and why?
- Is access within the system already limited to those who need it? (Confidential
  behaviour incidents are restricted to admins/safeguarding leads by role; SEND and SCR
  pages are similarly role-gated — confirm this matches the school's actual staffing
  structure.)
- Could the same purpose be achieved with less data, or data held for less time? (See
  the "Data retention" section of the main `README.md` — this system currently has no
  retention/deletion policy at all, which the DPO should treat as an open action.)

## Step 5: Identify and assess risks

| # | Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|---|
| 1 | Unauthorised access to SEND/safeguarding pupil records by a staff member without a legitimate need | Medium | High | Role-based access; `isConfidential` gating on SAFEGUARDING/BULLYING incidents (visible only to `TENANT_ADMIN`/`SUPER_ADMIN`/`isSafeguardingLead`); every SEND page view and pupil-record view is written to the audit log (`src/lib/audit.ts`), so access is at least reviewable after the fact. **Gap**: access is logged, not proactively alerted on — nothing currently flags unusual access patterns. |
| 2 | Unauthorised access to the Single Central Record (staff DBS/vetting data) | Low–Medium | High | SCR access is logged to the audit trail (`scr.viewed`, `scr.check_recorded` actions visible at `/portal/admin/audit-log`); page is admin-scoped. **Gap**: no additional field-level access control beyond role. |
| 3 | A CTF export is sent to, or accidentally shared with, the wrong recipient | Low | High | The exported file contains a full pupil record (name, DOB, address, SEND status, FSM status) in a standard DfE XML format designed to move between schools' own MIS systems. Every export is recorded in `CtfExchange` (who performed it, when, which pupil). **Gap**: the system does not verify the destination school itself — export delivery (email, USB, DfE S2S) happens outside this app, so recipient error is a process risk the school's own procedures must control, not something this system can prevent. |
| 4 | A malicious or malformed CTF *import* file compromises the server (e.g. XXE) | Low | Medium | `parseCtfXml` (`src/lib/ctf.ts`) uses `fast-xml-parser`, which does not resolve DTDs/external entities, so a crafted upload can't be used for XXE-style file read or SSRF. Imported data is parsed into a review object only — nothing is written to the database until a human confirms the mapping. |
| 5 | Third-party access to roster data via the Wonde integration | Low today; Medium once live | Medium–High | The Wonde API token is encrypted at rest (AES-256-GCM, `src/lib/crypto.ts`) and never returned to the client in plaintext (`src/app/api/wonde/route.ts` only ever echoes whether a token is set). **Important**: the actual sync job (`src/lib/wonde-sync.ts`) is a stub and not implemented yet — today this is a credential-storage risk only, not a live data-sharing one. Before enabling real sync, the school needs its own Data Processing Agreement with Wonde and this risk row needs re-assessing against what data the sync actually pulls. |
| 6 | Brute-force / credential-stuffing attack against staff or parent login | Medium | Medium–High | Login attempts are rate-limited (8 attempts per 15 minutes per email, `src/lib/auth.ts`); 2FA verification is separately rate-limited (10 per 15 minutes, `src/app/api/auth/2fa/verify/route.ts`); 2FA is mandatory for `TENANT_ADMIN`/`TRUST_ADMIN`/`SUPER_ADMIN`. **Gap**: the rate limiter (`src/lib/rate-limit.ts`) is in-memory and per-process — it does not share state across multiple app instances, so a multi-instance production deployment needs a shared store (e.g. Redis) for this protection to hold under load. |
| 7 | A staff member's device (laptop/phone) is lost or stolen while signed in | Medium | High | Session handling is via Auth.js; SSO accounts benefit from the identity provider's own device/session policies (e.g. Google/Microsoft conditional access), which is outside this app's control. **Gap**: no in-app remote session revocation or device management is documented here — confirm with the school's IT policy and IdP configuration. |
| 8 | Special category free-text fields (medical notes, SEND descriptions, incident descriptions) are stored unencrypted at the field level | High (as a fact) / Medium (as a realised risk) | High if the database itself is compromised | **No field-level encryption exists for these fields** — this system relies on database-level access control, transport encryption (TLS to the database), and the hosting provider's encryption-at-rest for the underlying storage/volume. This should be stated plainly to the DPO rather than implied to be stronger than it is. |
| 9 | Cross-tenant data leakage between two schools sharing one deployment, due to an application bug | Low | High | Tenant isolation is enforced in application code — every API route resolves `tenantId` from the authenticated session and scopes queries to it (never a client-supplied tenant id), per `src/lib/tenancy.ts`. **Gap**: this is a code-correctness control, not a database-enforced one (e.g. no Postgres row-level security) — a coding error in a new feature could in principle bypass it; this depends on code review discipline, not a structural guarantee. |
| 10 | No backup of the production database, or a backup that has never been tested | High today (no backup exists at all) | High (total, unrecoverable data loss) | See "Backups & data retention" in the main `README.md` — no backup mechanism is implemented in this repository today. This is a live gap, not a residual risk, and should block go-live until resolved. |
| 11 | Data retained indefinitely with no review or deletion process | High today | Medium–High (proportionality/minimisation breach, not just a security issue) | See "Backups & data retention" in the main `README.md`. No automatic retention/deletion exists; a manual pupil soft-delete/hard-delete flow exists (`src/app/api/pupils/[id]/route.ts`) but nothing triggers it on a schedule. |

*Likelihood/severity ratings above are a starting judgement to be reviewed and adjusted
by the DPO against the school's actual context — they are not a substitute for that
review.*

## Step 6: Measures to reduce risk / DPO sign-off

*[To be completed by the DPO. For each risk above with a residual gap, record:]*

| Risk # | Additional measure proposed | Owner | Target date | Residual risk after measure |
|---|---|---|---|---|
| | | | | |

**DPO decision**: *[Accept risks as they stand / Accept subject to the measures above /
Do not proceed — to be completed]*

**Signed off by**: *[name, role, date]*

---

*This template should be revisited whenever the system's data model or integrations
change materially (e.g. the Wonde sync going live, a new export format, a new third-party
service) — it is a point-in-time assessment, not a one-off document.*
