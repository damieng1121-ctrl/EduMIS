import { z } from "zod";
import { requireRole } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  return withApiErrors(async () => {
    await requireRole(["SUPER_ADMIN"]);
    return prisma.trust.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        tenants: { select: { id: true, name: true } },
        _count: { select: { tenants: true, users: true } },
      },
    });
  });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
});

export async function POST(req: Request) {
  return withApiErrors(async () => {
    await requireRole(["SUPER_ADMIN"]);
    const body = createSchema.parse(await req.json());
    return prisma.trust.create({ data: { ...body, slug: body.slug.toLowerCase() } });
  });
}
