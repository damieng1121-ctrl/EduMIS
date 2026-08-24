import { z } from "zod";
import { requireRole, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  role: z.enum(["STAFF", "TENANT_ADMIN", "TRUST_ADMIN", "SUPER_ADMIN"]).optional(),
  tenantId: z.string().nullable().optional(),
  trustId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

/** SUPER_ADMIN has neither; TRUST_ADMIN has only a trust; every other role has only a school. */
function assertRoleScope(role: string, tenantId: string | null, trustId: string | null) {
  if (role === "SUPER_ADMIN") {
    if (tenantId !== null || trustId !== null) throw new AuthError("Super admins have no school or Trust", 400);
  } else if (role === "TRUST_ADMIN") {
    if (tenantId !== null) throw new AuthError("Trust admins have no single school — assign a Trust instead", 400);
    if (trustId === null) throw new AuthError("Trust admins need a Trust", 400);
  } else {
    if (tenantId === null) throw new AuthError("This role needs a school", 400);
    if (trustId !== null) throw new AuthError("Only Trust admins have a Trust", 400);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    if (id === session.user.id) throw new AuthError("You can't change your own access here", 400);

    const body = bodySchema.parse(await req.json());
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new AuthError("User not found", 404);

    const role = body.role ?? target.role;
    const tenantId = body.tenantId !== undefined ? body.tenantId : target.tenantId;
    // Switching role clears the other scope field automatically unless the caller explicitly set it too.
    const trustId = body.trustId !== undefined ? body.trustId : role === target.role ? target.trustId : null;
    assertRoleScope(role, tenantId, trustId);

    const user = await prisma.user.update({ where: { id }, data: { ...body, role, tenantId, trustId } });

    await prisma.auditLog.create({
      data: {
        tenantId: tenantId,
        userId: session.user.id,
        action: "user.reassigned",
        entityType: "User",
        entityId: id,
        metadata: body,
      },
    });

    return user;
  });
}
