import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { authConfig } from "./auth.config";
import { prisma } from "./db";
import { getEmailDomain } from "./tenancy";
import { rateLimit } from "./rate-limit";

// 8 password attempts per email per 15 minutes — enough headroom for a
// genuine typo or two, tight enough to make a scripted brute-force
// impractical. Keyed by the submitted email, not the caller's IP, since
// the account being targeted is what actually needs protecting.
const LOGIN_ATTEMPT_LIMIT = 8;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

const isDevLoginEnabled = process.env.NODE_ENV !== "production";

function superAdminEmails(): string[] {
  return (process.env.EDUMIS_SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Resolve which tenant a sign-in belongs to, from the email's domain
 * against each Tenant's Google Workspace `domain`. Also handles the
 * platform super-admin allowlist. Idempotent — safe to call on every
 * sign-in, not just the first.
 */
async function resolveTenantAndRole(email: string) {
  if (superAdminEmails().includes(email.toLowerCase())) {
    return { tenantId: null, role: "SUPER_ADMIN" as const };
  }
  const domain = getEmailDomain(email);
  if (!domain) return null;
  const tenant = await prisma.tenant.findUnique({ where: { domain } });
  if (!tenant || !tenant.isActive) return null;
  return { tenantId: tenant.id, role: "STAFF" as const };
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      authorization: {
        params: {
          // Nudges Google's account chooser toward the user's Workspace
          // account rather than a personal Gmail account.
          hd: "*",
          prompt: "select_account",
        },
      },
      // Lets a Google or Microsoft sign-in "claim" a User row an admin
      // pre-created via invite (no linked account yet). Normally risky
      // ("account takeover through a second, less-trusted provider"), but
      // both are real SSO providers here — the actual security boundary is
      // the domain/pre-provisioned check in the signIn callback below, not
      // which OAuth provider was used to prove the email.
      allowDangerousEmailAccountLinking: true,
    }),
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      // "organizations" (not the default "common") — work/school accounts
      // only, matching Google's Workspace-only intent above. Any school's
      // Entra tenant can sign in; this is a multi-tenant app registration,
      // not locked to one specific Directory (tenant) ID.
      issuer: "https://login.microsoftonline.com/organizations/v2.0",
      allowDangerousEmailAccountLinking: true,
    }),
    // Non-production only (excluded from the array entirely, not just
    // hidden in the UI) — lets you sign in as any already-seeded user by
    // email with no password, for local/demo use before real Google OAuth
    // credentials are set up. Never creates a user: only an existing row
    // can be signed into this way.
    ...(isDevLoginEnabled
      ? [
          Credentials({
            id: "dev-login",
            name: "Dev login (local only)",
            credentials: { email: { label: "Email", type: "email" } },
            async authorize(credentials) {
              if (process.env.NODE_ENV === "production") return null;
              const email = typeof credentials?.email === "string" ? credentials.email : undefined;
              if (!email) return null;
              const user = await prisma.user.findUnique({ where: { email } });
              return user ? { id: user.id, email: user.email, name: user.name, image: user.image } : null;
            },
          }),
        ]
      : []),
    // Parents have no Google Workspace account, so they sign in with a
    // school-issued email + a password they set via /parent/set-password.
    // Runs in every environment (unlike dev-login above) — this is parents'
    // only way into the product.
    Credentials({
      id: "parent-login",
      name: "Parent login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.toLowerCase() : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;
        if (!rateLimit(`parent-login:${email}`, LOGIN_ATTEMPT_LIMIT, LOGIN_ATTEMPT_WINDOW_MS)) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role !== "PARENT" || !user.passwordHash || !user.isActive) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
    // A password-based alternative to Google/Microsoft SSO for staff/admin
    // accounts (not a replacement — an account can use either once a
    // password is set via /set-password, which only an admin invite can
    // trigger). Never PARENT — that's parent-login above, kept separate so
    // a leaked staff password can't be tried against parent accounts.
    Credentials({
      id: "staff-login",
      name: "Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.toLowerCase() : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;
        if (!rateLimit(`staff-login:${email}`, LOGIN_ATTEMPT_LIMIT, LOGIN_ATTEMPT_WINDOW_MS)) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role === "PARENT" || !user.passwordHash || !user.isActive) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.email) return false;
      // A pre-provisioned row (an admin's manual invite/assignment) is
      // always allowed to sign in, regardless of its email's domain —
      // that manual assignment is what makes it a member of a school. A
      // SUPER_ADMIN or TRUST_ADMIN legitimately has tenantId=null (a Trust
      // admin belongs to a Trust, not a single school), so role alone
      // grants it for those two, same as an explicit tenant membership.
      const existing = await prisma.user.findUnique({ where: { email: user.email } });
      if (existing && (existing.tenantId !== null || existing.role === "SUPER_ADMIN" || existing.role === "TRUST_ADMIN")) {
        return true;
      }
      // Otherwise fall back to domain-based auto-provisioning for a
      // genuinely first-ever sign-in.
      const resolved = await resolveTenantAndRole(user.email);
      return resolved !== null;
    },
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session) {
        // Client explicitly told us its 2FA state changed (enable/verify/disable
        // flows) — trust it rather than re-hitting the DB on every session read.
        if (typeof session.twoFactorVerified === "boolean") token.twoFactorVerified = session.twoFactorVerified;
        if (typeof session.twoFactorEnabled === "boolean") token.twoFactorEnabled = session.twoFactorEnabled;
        // Only a real platform SUPER_ADMIN, or a TRUST_ADMIN acting within
        // their own Trust, can ever set this — never an ordinary tenant user
        // overriding their own membership. Validated against a real, active
        // school (and, for a TRUST_ADMIN, that the school actually belongs
        // to their Trust) so a stale/bogus id can't linger, and a Trust
        // leader can never act as a school outside their own Trust.
        if ("actingTenantId" in session && (token.role === "SUPER_ADMIN" || token.role === "TRUST_ADMIN")) {
          if (session.actingTenantId === null) {
            token.actingTenantId = null;
          } else if (typeof session.actingTenantId === "string") {
            const tenant = await prisma.tenant.findUnique({ where: { id: session.actingTenantId } });
            const allowed = tenant?.isActive && (token.role === "SUPER_ADMIN" || tenant.trustId === token.trustId);
            token.actingTenantId = allowed ? tenant.id : null;
          }
        }
        return token;
      }

      // Only present on a fresh sign-in. Deliberately just reads whatever
      // tenantId/role the user row already has — never recomputes it from
      // the email's domain here. Domain-based auto-provisioning only ever
      // happens once, in the createUser event below, for a brand-new row;
      // after that, an admin's manual invite/reassignment is the source of
      // truth and must not be silently overwritten on the next login.
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.tenantId = dbUser.tenantId;
          token.actingTenantId = null;
          token.trustId = dbUser.trustId;
          token.twoFactorEnabled = dbUser.twoFactorEnabled;
          token.twoFactorVerified = !dbUser.twoFactorEnabled;
          token.isTeacher = dbUser.isTeacher;
        }
      }

      return token;
    },
    // session() is inherited from authConfig.callbacks (see auth.config.ts)
    // — it's pure token->session mapping with no DB access, so it's shared
    // as-is rather than duplicated here.
  },
  events: {
    async createUser({ user }) {
      if (!user.email || !user.id) return;
      const resolved = await resolveTenantAndRole(user.email);
      if (resolved) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            tenantId: resolved.tenantId,
            role: resolved.role,
          },
        });
      }
      await prisma.auditLog.create({
        data: {
          tenantId: resolved?.tenantId ?? null,
          action: "user.created",
          entityType: "User",
          entityId: user.id,
          metadata: { email: user.email },
        },
      });
    },
  },
});
