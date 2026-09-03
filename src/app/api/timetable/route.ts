import { z } from "zod";
import { requireMisSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";
import type { Prisma } from "@prisma/client";

const WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;

const SLOT_INCLUDE = {
  formGroup: { select: { id: true, name: true } },
  subject: { select: { id: true, name: true } },
  teacher: { select: { id: true, name: true, email: true } },
} satisfies Prisma.TimetableSlotInclude;

export async function GET(req: Request) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const formGroupId = new URL(req.url).searchParams.get("formGroupId");

    const where: Prisma.TimetableSlotWhereInput = { tenantId: session.user.tenantId };
    if (formGroupId) where.formGroupId = formGroupId;

    return prisma.timetableSlot.findMany({
      where,
      orderBy: [{ dayOfWeek: "asc" }, { periodNumber: "asc" }],
      include: SLOT_INCLUDE,
    });
  });
}

const createSchema = z.object({
  formGroupId: z.string().min(1),
  dayOfWeek: z.enum(WEEKDAYS),
  periodNumber: z.number().int().min(1).max(20),
  subjectId: z.string().min(1),
  teacherId: z.string().min(1),
  room: z.string().max(60).optional(),
});

export async function POST(req: Request) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    if (!isAdmin(session.user.role)) throw new AuthError("Admins only", 403);
    const body = createSchema.parse(await req.json());

    const formGroup = await prisma.formGroup.findUnique({ where: { id: body.formGroupId } });
    if (!formGroup || formGroup.tenantId !== session.user.tenantId) throw new AuthError("Form group not found", 404);

    const subject = await prisma.assessmentSubject.findUnique({ where: { id: body.subjectId } });
    if (!subject || subject.tenantId !== session.user.tenantId) throw new AuthError("Subject not found", 404);

    const teacher = await prisma.user.findUnique({ where: { id: body.teacherId } });
    if (!teacher || teacher.tenantId !== session.user.tenantId) throw new AuthError("Teacher not found", 404);

    // Not a hard constraint (no clash detection engine here) — just a
    // best-effort heads-up if the same teacher is already down for another
    // form group at the same day/period.
    const clash = await prisma.timetableSlot.findFirst({
      where: {
        tenantId: session.user.tenantId,
        teacherId: body.teacherId,
        dayOfWeek: body.dayOfWeek,
        periodNumber: body.periodNumber,
      },
      include: { formGroup: { select: { name: true } } },
    });

    const slot = await prisma.timetableSlot.create({
      data: { ...body, tenantId: session.user.tenantId },
      include: SLOT_INCLUDE,
    });

    return { ...slot, clashWarning: clash ? `${teacher.name ?? teacher.email} is also timetabled for ${clash.formGroup.name} at this time` : null };
  });
}
