import { z } from "zod";
import { requireMisSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";
import type { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;

const SLOT_INCLUDE = {
  formGroup: { select: { id: true, name: true } },
  subject: { select: { id: true, name: true } },
  teacher: { select: { id: true, name: true, email: true } },
} satisfies Prisma.TimetableSlotInclude;

const patchSchema = z.object({
  formGroupId: z.string().min(1).optional(),
  dayOfWeek: z.enum(WEEKDAYS).optional(),
  periodNumber: z.number().int().min(1).max(20).optional(),
  subjectId: z.string().min(1).optional(),
  teacherId: z.string().min(1).optional(),
  room: z.string().max(60).nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    if (!isAdmin(session.user.role)) throw new AuthError("Admins only", 403);
    const { id } = await params;

    const slot = await prisma.timetableSlot.findUnique({ where: { id } });
    if (!slot || slot.tenantId !== session.user.tenantId) throw new AuthError("Not found", 404);

    const body = patchSchema.parse(await req.json());

    if (body.formGroupId) {
      const formGroup = await prisma.formGroup.findUnique({ where: { id: body.formGroupId } });
      if (!formGroup || formGroup.tenantId !== session.user.tenantId) throw new AuthError("Form group not found", 404);
    }
    if (body.subjectId) {
      const subject = await prisma.assessmentSubject.findUnique({ where: { id: body.subjectId } });
      if (!subject || subject.tenantId !== session.user.tenantId) throw new AuthError("Subject not found", 404);
    }
    if (body.teacherId) {
      const teacher = await prisma.user.findUnique({ where: { id: body.teacherId } });
      if (!teacher || teacher.tenantId !== session.user.tenantId) throw new AuthError("Teacher not found", 404);
    }

    return prisma.timetableSlot.update({
      where: { id },
      data: body,
      include: SLOT_INCLUDE,
    });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    if (!isAdmin(session.user.role)) throw new AuthError("Admins only", 403);
    const { id } = await params;

    const slot = await prisma.timetableSlot.findUnique({ where: { id } });
    if (!slot || slot.tenantId !== session.user.tenantId) throw new AuthError("Not found", 404);

    await prisma.timetableSlot.delete({ where: { id } });
    return { ok: true };
  });
}
