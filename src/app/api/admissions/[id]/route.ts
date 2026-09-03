import { z } from "zod";
import { requireFeatureSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";

type Params = { params: Promise<{ id: string }> };

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

const patchSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  dob: z.coerce.date().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  preferredYearGroup: z.enum(YEAR_GROUPS).optional(),
  applicationType: z.enum(["NORMAL_ROUND", "IN_YEAR"]).optional(),
  status: z.enum(["RECEIVED", "OFFERED", "WAITING_LIST", "ACCEPTED", "DECLINED", "WITHDRAWN"]).optional(),
  waitingListPosition: z.number().int().min(1).nullable().optional(),
  guardianName: z.string().trim().min(1).max(150).optional(),
  guardianEmail: z.string().trim().email().max(150).nullable().optional(),
  guardianPhone: z.string().trim().max(30).nullable().optional(),
  addressLine1: z.string().trim().max(200).nullable().optional(),
  addressLine2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  postcode: z.string().trim().max(20).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireFeatureSession("ADMISSIONS");
    if (!isAdmin(session.user.role)) throw new AuthError("Admins only", 403);
    const { id } = await params;

    const application = await prisma.admissionApplication.findUnique({ where: { id } });
    if (!application || application.tenantId !== session.user.tenantId) throw new AuthError("Not found", 404);

    const body = patchSchema.parse(await req.json());
    const yearGroup = body.preferredYearGroup ?? application.preferredYearGroup;

    let waitingListPosition = body.waitingListPosition;
    if (body.status === "WAITING_LIST") {
      // Auto-assign the next free slot at the back of this year group's list, unless
      // the caller explicitly moved this applicant to a specific position.
      if (waitingListPosition === undefined) {
        const last = await prisma.admissionApplication.findFirst({
          where: { tenantId: session.user.tenantId, preferredYearGroup: yearGroup, status: "WAITING_LIST" },
          orderBy: { waitingListPosition: "desc" },
          select: { waitingListPosition: true },
        });
        waitingListPosition = (last?.waitingListPosition ?? 0) + 1;
      }
    } else if (body.status) {
      // No longer waiting — a position only means something within that status.
      waitingListPosition = null;
    }

    const updated = await prisma.admissionApplication.update({
      where: { id },
      data: { ...body, ...(waitingListPosition !== undefined ? { waitingListPosition } : {}) },
    });

    return updated;
  });
}
