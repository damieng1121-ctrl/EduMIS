import type { ModuleKey } from "@/lib/module-theme";

export type HelpArticle = {
  slug: string;
  module: ModuleKey;
  category: string;
  title: string;
  summary: string;
  steps: string[];
};

export const HELP_CATEGORIES = [
  "Getting started",
  "Pupils & progress",
  "School life",
  "Staff & admin",
  "Compliance & reports",
  "Account & settings",
] as const;

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "signing-in",
    module: "security",
    category: "Getting started",
    title: "Signing in and setting up two-factor authentication",
    summary: "Most staff roles require a six-digit code from an authenticator app in addition to your password.",
    steps: [
      "Sign in with your school Google/Microsoft account, or your email and password if you were sent a setup link.",
      "First time in? You'll be asked to scan a QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, or similar) to turn on two-factor authentication.",
      "From then on, each new sign-in asks for a fresh six-digit code from that app.",
      "Lost your device? Ask a school admin to reset your two-factor setup from Users so you can re-register a new one.",
    ],
  },
  {
    slug: "roles-permissions",
    module: "school",
    category: "Getting started",
    title: "Understanding roles and what you can see",
    summary: "What's in your nav bar depends on your role — Staff, Admin, Trust admin, or Platform admin.",
    steps: [
      "Staff see the day-to-day modules for their classes: Pupils, Attendance, Behaviour, and anything else your school has switched on.",
      "Admins additionally see Staff & admin and Compliance & reports — school-wide administration and statutory reporting.",
      "Trust admins can switch between every school in their trust from My Trust.",
      "Platform admins (EduMIS support) manage schools, trusts, and user accounts platform-wide from Schools.",
    ],
  },
  {
    slug: "adding-a-pupil",
    module: "pupils",
    category: "Pupils & progress",
    title: "Adding or editing a pupil",
    summary: "Pupil records hold year group, form group, SEND status, and guardian contacts.",
    steps: [
      "Go to Pupils & progress → Pupils and click Add pupil.",
      "Fill in their name, year group, form group, and date of birth — everything else can be added later.",
      "Open a pupil's record to add guardians, SEND details, and see their attendance/behaviour history in one place.",
    ],
  },
  {
    slug: "taking-attendance",
    module: "attendance",
    category: "Pupils & progress",
    title: "Taking the attendance register",
    summary: "Registers are taken per form group, per session (AM/PM), for a given date.",
    steps: [
      "Go to Pupils & progress → Attendance, then pick the form group, date, and session.",
      "Set each pupil's code (Present, Late, Authorised absence, Unauthorised absence, etc.) and click Save register.",
      "A register can be edited later the same way — just reopen it for that date and session.",
    ],
  },
  {
    slug: "logging-behaviour",
    module: "behaviour",
    category: "Pupils & progress",
    title: "Logging a behaviour incident or reward point",
    summary: "Behaviour covers both concerns/incidents and positive achievement points.",
    steps: [
      "Go to Pupils & progress → Behaviour and click Log incident (or Award points, if your school uses the points system).",
      "Pick the pupil, the type (Concern, Achievement, etc.), and add a short note of what happened.",
      "Recent entries for a pupil are visible from their own pupil record too.",
    ],
  },
  {
    slug: "send-support",
    module: "send",
    category: "Pupils & progress",
    title: "Recording SEND support and EHCPs",
    summary: "Track SEND status, support level, and EHCP details for pupils who need it.",
    steps: [
      "Go to Pupils & progress → SEND, or open the pupil's own record and go to their SEND tab.",
      "Set their SEND status (SEND Support, EHCP, etc.) and record the details of the support in place.",
      "This status also shows as a badge on the main Pupils list so it's visible at a glance.",
    ],
  },
  {
    slug: "assessment-results",
    module: "assessment",
    category: "Pupils & progress",
    title: "Entering assessment results",
    summary: "Record termly or subject-based assessment outcomes per pupil.",
    steps: [
      "Go to Pupils & progress → Assessment and choose the subject and academic year.",
      "Enter or update each pupil's result — changes save as you go.",
      "Use Targets alongside this to track whether a pupil is on course to meet their goals.",
    ],
  },
  {
    slug: "pupil-targets",
    module: "targets",
    category: "Pupils & progress",
    title: "Setting and reviewing pupil targets",
    summary: "Targets give each pupil a goal to track against their assessment results.",
    steps: [
      "Go to Pupils & progress → Targets, pick a pupil, and set a subject target and target date.",
      "Review progress here as new assessment results come in.",
    ],
  },
  {
    slug: "interventions",
    module: "interventions",
    category: "Pupils & progress",
    title: "Running an intervention",
    summary: "Interventions track a structured programme of extra support for a pupil or small group.",
    steps: [
      "Go to Pupils & progress → Interventions and click Add intervention.",
      "Name it, set who's involved and the review date, and log notes as sessions happen.",
    ],
  },
  {
    slug: "clubs",
    module: "clubs",
    category: "School life",
    title: "Managing clubs",
    summary: "Set up clubs and track which pupils are signed up.",
    steps: [
      "Go to School life → Clubs and click Add club to create one, or open an existing club to manage its register.",
      "If your school doesn't use clubs, an admin can hide this from the nav in Settings → Nav modules.",
    ],
  },
  {
    slug: "meals",
    module: "meals",
    category: "School life",
    title: "Recording meal choices",
    summary: "A simple daily meal register, similar in shape to the attendance register.",
    steps: [
      "Go to School life → Meals, pick the date and form group, and set each pupil's meal choice.",
    ],
  },
  {
    slug: "parents-evenings",
    module: "parents-evenings",
    category: "School life",
    title: "Booking parents' evenings",
    summary: "Set up appointment slots that parents book through their own parent portal login.",
    steps: [
      "Go to School life → Parents' evenings and create an event with its date and available time slots.",
      "Parents book directly through their own account — bookings show up here as they come in.",
    ],
  },
  {
    slug: "messages",
    module: "messages",
    category: "School life",
    title: "Sending messages to parents",
    summary: "Send a message to a class, year group, or individual guardians — delivered by email (and SMS, if enabled).",
    steps: [
      "Go to School life → Messages, click New message, choose your audience, and write it.",
      "SMS delivery only works once a school admin has set up an SMS provider in Settings.",
    ],
  },
  {
    slug: "timetable",
    module: "timetable",
    category: "School life",
    title: "Building the timetable",
    summary: "Set up weekly timetable slots per form group.",
    steps: [
      "Go to School life → Timetable, pick a form group, and add sessions to each day.",
    ],
  },
  {
    slug: "staff-records",
    module: "staff",
    category: "Staff & admin",
    title: "Staff records",
    summary: "A directory of staff with their role, job title, and safeguarding-lead status.",
    steps: [
      "Go to Staff & admin → Staff records to see the full list.",
      "Open a staff member's record to update their job title or safeguarding responsibilities.",
    ],
  },
  {
    slug: "cover",
    module: "cover",
    category: "Staff & admin",
    title: "Arranging cover for absence",
    summary: "Track which classes need cover and who's been assigned.",
    steps: [
      "Go to Staff & admin → Cover and click Add cover request for the date and class affected.",
      "Assign a covering staff member once one's confirmed.",
    ],
  },
  {
    slug: "managing-users",
    module: "users",
    category: "Staff & admin",
    title: "Inviting and managing user accounts",
    summary: "Admins can invite staff, set their role, and remove accounts that are no longer needed.",
    steps: [
      "Go to Staff & admin → Users and click Invite user — this sends them an email with a link to set their password.",
      "Change someone's role, or toggle Active/Disabled, from the same table.",
      "Delete only removes accounts with no history attached (e.g. no recorded attendance/behaviour) — anyone with history should be disabled instead, to keep the records they created intact.",
    ],
  },
  {
    slug: "audit-log",
    module: "audit-log",
    category: "Staff & admin",
    title: "Reviewing the audit log",
    summary: "A record of who accessed or changed sensitive data (pupil records, SEND, SCR) and when.",
    steps: [
      "Go to Staff & admin → Audit log to see recent activity, filterable by user or record type.",
    ],
  },
  {
    slug: "scr",
    module: "scr",
    category: "Staff & admin",
    title: "Single Central Record",
    summary: "The statutory record of pre-employment safer-recruitment checks for everyone working with your pupils.",
    steps: [
      "Go to Staff & admin → Single Central Record and click Add entry for a new starter.",
      "Keep each check (DBS, right to work, references, etc.) up to date as they're completed.",
    ],
  },
  {
    slug: "reports",
    module: "reports",
    category: "Compliance & reports",
    title: "Generating reports",
    summary: "School-wide reports across attendance, behaviour, and assessment, plus individual pupil progress reports.",
    steps: [
      "Go to Compliance & reports → Reports for whole-school summaries.",
      "For an individual pupil's progress report, open their record from Pupils and go to the Report tab.",
    ],
  },
  {
    slug: "census",
    module: "census",
    category: "Compliance & reports",
    title: "Preparing for the school census",
    summary: "Checks your pupil data for gaps before a statutory census return.",
    steps: [
      "Go to Compliance & reports → Census readiness to see what's missing (e.g. ethnicity, language, exclusions) before the return is due.",
    ],
  },
  {
    slug: "ctf-exchange",
    module: "ctf",
    category: "Compliance & reports",
    title: "CTF exchange (pupil transfers)",
    summary: "Export a Common Transfer File when a pupil leaves, or import one when a pupil joins from another school.",
    steps: [
      "Go to Compliance & reports → CTF exchange.",
      "Export: select the leaving pupil and download their CTF file to send to their new school.",
      "Import: upload a CTF file from a pupil's previous school to pre-fill their record.",
    ],
  },
  {
    slug: "admissions",
    module: "admissions",
    category: "Compliance & reports",
    title: "Admissions & waiting lists",
    summary: "Track applications and waiting-list positions before a pupil is formally enrolled.",
    steps: [
      "Go to Compliance & reports → Admissions and click Add application.",
      "Once a place is confirmed, convert the application into a full pupil record.",
    ],
  },
  {
    slug: "wonde",
    module: "wonde",
    category: "Compliance & reports",
    title: "Wonde integration",
    summary: "Wonde can sync pupil and staff data in from your MIS provider instead of entering it by hand.",
    steps: [
      "Go to Compliance & reports → Wonde and enter your Wonde API credentials.",
      "Run a sync to pull in pupils and staff — this needs setting up once by a school admin.",
    ],
  },
  {
    slug: "account-security",
    module: "security",
    category: "Account & settings",
    title: "Managing your own account and security",
    summary: "Change your two-factor setup or see your account details from any page.",
    steps: [
      "Click your name in the top-right of the nav bar to open Account → Security.",
      "From there you can re-register two-factor authentication if you've changed devices.",
    ],
  },
  {
    slug: "school-settings",
    module: "settings",
    category: "Account & settings",
    title: "Customising your school's branding",
    summary: "Admins can set a logo, brand colour, and hide modules the school doesn't use.",
    steps: [
      "Go to Staff & admin → Settings (or Settings in the main nav, if you're an admin).",
      "Upload a logo, pick a brand colour, and set an optional custom app name.",
      "Under Nav modules, hide anything (like Clubs or Meals) your school doesn't use.",
    ],
  },
  {
    slug: "dark-mode",
    module: "settings",
    category: "Account & settings",
    title: "Switching between light and dark mode",
    summary: "Click the sun/moon icon in the top-right of the nav bar to toggle themes — your choice is remembered.",
    steps: [
      "Click the sun/moon icon next to the Help icon in the top bar.",
      "Your preference is saved in this browser, so it'll still be set next time you sign in here.",
    ],
  },
];
