import { z } from "zod";
import { requireRole, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getEmailDomain } from "@/lib/tenancy";
import { issueStaffSetPasswordToken } from "@/lib/staff-invite";

export async function GET() {
  return withApiErrors(async () => {
    await requireRole(["SUPER_ADMIN"]);
    return prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        trustId: true,
        tenant: { select: { name: true } },
        isActive: true,
        twoFactorEnabled: true,
        _count: { select: { accounts: true } },
      },
    });
  });
}

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().max(150).optional(),
  role: z.enum(["STAFF", "TENANT_ADMIN", "TRUST_ADMIN", "SUPER_ADMIN"]),
  tenantId: z.string().nullable(),
  trustId: z.string().nullable().optional(),
});

/** SUPER_ADMIN has neither; TRUST_ADMIN has only a trust; every other role has only a school. */
function assertRoleScope(role: string, tenantId: string | null, trustId: string | null | undefined) {
  if (role === "SUPER_ADMIN") {
    if (tenantId !== null || trustId) throw new AuthError("Super admins have no school or Trust", 400);
  } else if (role === "TRUST_ADMIN") {
    if (tenantId !== null) throw new AuthError("Trust admins have no single school — assign a Trust instead", 400);
    if (!trustId) throw new AuthError("Trust admins need a Trust", 400);
  } else {
    if (tenantId === null) throw new AuthError("This role needs a school", 400);
    if (trustId) throw new AuthError("Only Trust admins have a Trust", 400);
  }
}

export async function POST(req: Request) {
  return withApiErrors(async () => {
    await requireRole(["SUPER_ADMIN"]);
    const body = createSchema.parse(await req.json());
    assertRoleScope(body.role, body.tenantId, body.trustId);
    const email = body.email.toLowerCase();
    const trustId = body.trustId ?? null;

    // A school-scoped role's email must belong to that school's own domain —
    // Trust/Super admins aren't tied to a single school, so they're exempt.
    if (body.tenantId) {
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: body.tenantId } });
      if (tenant.domain && getEmailDomain(email) !== tenant.domain) {
        throw new AuthError(`This role's email must be on the school's domain (${tenant.domain})`, 400);
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { tenantId: body.tenantId, trustId, role: body.role, name: body.name ?? existing.name },
      });
    }
    const user = await prisma.user.create({
      data: { email, name: body.name, role: body.role, tenantId: body.tenantId, trustId },
    });
    await issueStaffSetPasswordToken(email);
    return user;
  });
}
