import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PortalNav } from "@/components/portal-nav";
import { ActingBanner } from "@/components/acting-banner";

export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "PARENT") redirect("/parent");
  if (session.user.twoFactorEnabled && !session.user.twoFactorVerified) redirect("/verify-2fa");

  const canAct = session.user.role === "SUPER_ADMIN" || session.user.role === "TRUST_ADMIN";
  const isActing = canAct && Boolean(session.user.actingTenantId);

  const [tenant, trust] = await Promise.all([
    session.user.tenantId
      ? prisma.tenant.findUnique({
          where: { id: session.user.tenantId },
          select: { name: true, logoUrl: true, appName: true, sidebarColor: true, disabledNavItems: true, enabledFeatures: true },
        })
      : null,
    // Only fetched to label the header when a TRUST_ADMIN isn't currently acting as a specific school.
    session.user.role === "TRUST_ADMIN" && session.user.trustId && !isActing
      ? prisma.trust.findUnique({ where: { id: session.user.trustId }, select: { name: true } })
      : null,
  ]);

  const platformLabel = trust ? `${trust.name} — Trust admin` : "EduMIS platform admin";

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-50">
      <PortalNav
        // A super admin or trust admin managing a school gets that school's
        // full nav (as a tenant admin would see it), not just their own
        // platform/trust-level link.
        role={isActing ? "TENANT_ADMIN" : session.user.role}
        userName={session.user.name ?? session.user.email ?? "Account"}
        tenantName={tenant?.name ?? platformLabel}
        appName={tenant?.appName ?? "EduMIS"}
        hasLogo={Boolean(tenant?.logoUrl)}
        sidebarColor={tenant?.sidebarColor ?? null}
        disabledNavItems={tenant?.disabledNavItems ?? []}
        enabledFeatures={tenant?.enabledFeatures ?? []}
        isTeacher={isActing ? true : session.user.isTeacher}
      />
      {isActing && (
        <div className="print:hidden">
          <ActingBanner
            tenantName={tenant?.name ?? "this school"}
            actorLabel={session.user.role === "TRUST_ADMIN" ? "a Trust leader" : "an EduMIS platform admin"}
            exitHref={session.user.role === "TRUST_ADMIN" ? "/portal/trust-admin" : "/portal/super-admin"}
          />
        </div>
      )}
      <main className="mx-auto w-full max-w-[1600px] flex-1 p-8 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
