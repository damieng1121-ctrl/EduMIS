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
