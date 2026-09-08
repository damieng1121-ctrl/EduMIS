import { AuthError, requireRole } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/**
 * A Trust's tenants aren't cascade-deleted with it (unlike a Tenant's own
 * data) — deleting a Trust that still has schools attached would either
 * fail on the FK constraint or (if it didn't) silently orphan those
 * schools' trustId. Simpler and safer: require every school be reassigned
 * or made standalone first, via the existing per-school Trust dropdown.
 */
export async function DELETE(_req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;

    const trust = await prisma.trust.findUnique({
      where: { id },
      include: { _count: { select: { tenants: true, users: true } } },
    });
    if (!trust) throw new AuthError("Trust not found", 404);
    if (trust._count.tenants > 0) {
      throw new AuthError(
        `${trust.name} still has ${trust._count.tenants} school(s) assigned — move them to another Trust or make them standalone first.`,
        409,
      );
    }
    if (trust._count.users > 0) {
      throw new AuthError(
        `${trust.name} still has ${trust._count.users} Trust admin(s) assigned — reassign or remove them first.`,
        409,
      );
    }

    await prisma.trust.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        tenantId: null,
        userId: session.user.id,
        action: "trust.deleted",
        entityType: "Trust",
        entityId: id,
        metadata: { name: trust.name, slug: trust.slug },
      },
    });

    return { ok: true };
  });
}
