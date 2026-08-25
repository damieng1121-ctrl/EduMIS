import { z } from "zod";
import { requireRole } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { FEATURE_KEYS } from "@/lib/features";

export async function GET() {
  return withApiErrors(async () => {
    await requireRole(["SUPER_ADMIN"]);
    return prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true, pupils: true } } },
    });
  });
}

// .trim() runs before the regex checks below it — a stray leading/trailing
// space from a copy-paste (very easy to pick up from an email or a school's
// website) would otherwise fail validation in a way that's confusing to
// debug from the generic "Invalid request" response.
const createSchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  domain: z
    .string()
    .trim()
    .min(3)
    .max(150)
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Must be a bare domain, e.g. school-name.sch.uk"),
  phase: z.enum(["NURSERY", "PRIMARY", "SECONDARY", "ALL_THROUGH", "SPECIAL", "MULTI_ACADEMY_TRUST"]),
  urn: z.string().trim().max(20).optional(),
  /// Assign this school to a Federation/Trust at creation time — optional, can also be set later via PATCH.
  trustId: z.string().nullable().optional(),
  brandColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex colour, e.g. #2563eb").optional(),
  addressLine1: z.string().trim().max(200).optional(),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  postcode: z.string().trim().max(20).optional(),
  headteacherName: z.string().trim().max(150).optional(),
  contactEmail: z.string().trim().email().max(150).optional(),
  contactPhone: z.string().trim().max(30).optional(),
  /// Modules to switch on immediately, instead of a separate trip to the Features tab after onboarding.
  enabledFeatures: z.array(z.enum(FEATURE_KEYS as [string, ...string[]])).optional(),
});

export async function POST(req: Request) {
  return withApiErrors(async () => {
    await requireRole(["SUPER_ADMIN"]);
    const body = createSchema.parse(await req.json());
    return prisma.tenant.create({
      data: { ...body, domain: body.domain.toLowerCase(), slug: body.slug.toLowerCase() },
    });
  });
}
