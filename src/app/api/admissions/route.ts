import { z } from "zod";
import { requireFeatureSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { canAccessMis, isAdmin } from "@/lib/roles";
import type { Prisma } from "@prisma/client";

const YEAR_GROUPS = [
  "NURSERY",
  "RECEPTION",
  "YEAR_1",
  "YEAR_2",
  "YEAR_3",
  "YEAR_4",
  "YEAR_5",
  "YEAR_6",
  "YEAR_7",
  "YEAR_8",
  "YEAR_9",
  "YEAR_10",
  "YEAR_11",
  "YEAR_12",
  "YEAR_13",
] as const;

const STATUSES = ["RECEIVED", "OFFERED", "WAITING_LIST", "ACCEPTED", "DECLINED", "WITHDRAWN"] as const;

export async function GET(req: Request) {
  return withApiErrors(async () => {
    const session = await requireFeatureSession("ADMISSIONS");
    if (!canAccessMis(session.user.role, session.user.isTeacher)) {
      throw new AuthError("This area is only available to teachers and school admins", 403);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const yearGroup = searchParams.get("yearGroup");

    const where: Prisma.AdmissionApplicationWhereInput = {
      tenantId: session.user.tenantId,
      ...(status && (STATUSES as readonly string[]).includes(status) ? { status: status as (typeof STATUSES)[number] } : {}),
      ...(yearGroup && (YEAR_GROUPS as readonly string[]).includes(yearGroup)
        ? { preferredYearGroup: yearGroup as (typeof YEAR_GROUPS)[number] }
        : {}),
    };

    return prisma.admissionApplication.findMany({
      where,
      orderBy: [{ preferredYearGroup: "asc" }, { waitingListPosition: "asc" }, { createdAt: "asc" }],
    });
  });
}

const createSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  dob: z.coerce.date(),
  gender: z.enum(["MALE", "FEMALE"]),
  preferredYearGroup: z.enum(YEAR_GROUPS),
  applicationType: z.enum(["NORMAL_ROUND", "IN_YEAR"]),
  guardianName: z.string().trim().min(1).max(150),
  guardianEmail: z.string().trim().email().max(150).optional(),
  guardianPhone: z.string().trim().max(30).optional(),
  addressLine1: z.string().trim().max(200).optional(),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  postcode: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export async function POST(req: Request) {
  return withApiErrors(async () => {
    const session = await requireFeatureSession("ADMISSIONS");
    if (!isAdmin(session.user.role)) throw new AuthError("Admins only", 403);

    const body = createSchema.parse(await req.json());

    return prisma.admissionApplication.create({
      data: { ...body, tenantId: session.user.tenantId, status: "RECEIVED" },
    });
  });
}
