import { z } from "zod";
import { requireFeatureSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";

/** The Single Central Record — every current staff member plus their KCSIE vetting checks. */
export async function GET() {
  return withApiErrors(async () => {
    const session = await requireFeatureSession("SCR");
    if (!isAdmin(session.user.role)) throw new AuthError("Admins only", 403);

    return prisma.user.findMany({
      where: {
        tenantId: session.user.tenantId,
        OR: [{ role: { in: ["TENANT_ADMIN", "STAFF"] } }, { isTeacher: true }],
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        isTeacher: true,
        staffProfile: true,
      },
    });
  });
}

const dateField = z.string().datetime().nullable().optional();

const DATE_FIELDS = [
  "identityCheckDate",
  "rightToWorkCheckDate",
  "barredListCheckDate",
  "prohibitionCheckDate",
  "qualificationsCheckedDate",
  "referencesObtainedDate",
  "overseasCheckDate",
] as const;

const upsertSchema = z.object({
  userId: z.string().min(1),
  rightToWorkEvidence: z.string().max(100).nullable().optional(),
  identityCheckDate: dateField,
  rightToWorkCheckDate: dateField,
  barredListCheckDate: dateField,
  prohibitionCheckDate: dateField,
  qualificationsCheckedDate: dateField,
  referencesObtainedDate: dateField,
  overseasCheckDate: dateField,
});

export async function POST(req: Request) {
  return withApiErrors(async () => {
    const session = await requireFeatureSession("SCR");
    if (!isAdmin(session.user.role)) throw new AuthError("Admins only", 403);
    const { userId, ...body } = upsertSchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.tenantId !== session.user.tenantId) throw new AuthError("User not found", 404);

    const dates = Object.fromEntries(
      DATE_FIELDS.map((f) => [f, body[f] === undefined ? undefined : body[f] ? new Date(body[f]) : null]),
    );
    const data = { rightToWorkEvidence: body.rightToWorkEvidence, ...dates };

    // A staff member's core StaffProfile row (staffType etc.) may not exist yet if an
    // admin heads straight to the SCR page before visiting Staff records — default to
    // "OTHER" rather than failing, since staffType isn't this page's concern.
    return prisma.staffProfile.upsert({
      where: { userId },
      create: { tenantId: session.user.tenantId, userId, staffType: "OTHER", ...data },
      update: data,
    });
  });
}
