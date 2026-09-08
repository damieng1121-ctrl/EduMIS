import { z } from "zod";
import { requireRole, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { FEATURE_KEYS } from "@/lib/features";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  isActive: z.boolean().optional(),
  /// Move this school into a Federation/Trust, or pass null to make it standalone again.
  trustId: z.string().nullable().optional(),
  /// Full replacement list of this school's optional-module toggles (see src/lib/features.ts).
  enabledFeatures: z.array(z.enum(FEATURE_KEYS as [string, ...string[]])).optional(),
  urn: z.string().trim().max(20).nullable().optional(),
  brandColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex colour, e.g. #2563eb").optional(),
  addressLine1: z.string().trim().max(200).nullable().optional(),
  addressLine2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  postcode: z.string().trim().max(20).nullable().optional(),
  headteacherName: z.string().trim().max(150).nullable().optional(),
  contactEmail: z.string().trim().email().max(150).nullable().optional(),
  contactPhone: z.string().trim().max(30).nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  return withApiErrors(async () => {
    await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new AuthError("School not found", 404);
    const body = bodySchema.parse(await req.json());
    return prisma.tenant.update({ where: { id }, data: body });
  });
}

const deleteSchema = z.object({
  /// The caller must echo the school's exact name back — this permanently
  /// deletes every pupil, staff record, attendance entry etc. it owns (all
  /// cascade off Tenant), so a stray click can't do this by accident.
  confirmName: z.string(),
});

export async function DELETE(req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new AuthError("School not found", 404);

    const { confirmName } = deleteSchema.parse(await req.json());
    if (confirmName.trim() !== tenant.name) {
      throw new AuthError("Type the school's exact name to confirm deletion", 400);
    }

    await prisma.tenant.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        tenantId: null,
        userId: session.user.id,
        action: "tenant.deleted",
        entityType: "Tenant",
        entityId: id,
        metadata: { name: tenant.name, slug: tenant.slug },
      },
    });

    return { ok: true };
  });
}
