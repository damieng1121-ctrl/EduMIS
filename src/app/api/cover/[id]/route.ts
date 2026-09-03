import { z } from "zod";
import { requireMisSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const COVER_INCLUDE = {
  timetableSlot: {
    select: {
      id: true,
      dayOfWeek: true,
      periodNumber: true,
      room: true,
      formGroup: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
  },
  absentTeacher: { select: { id: true, name: true, email: true } },
  coveringTeacher: { select: { id: true, name: true, email: true } },
} satisfies Prisma.CoverAssignmentInclude;

const patchSchema = z.object({
  coveringTeacherId: z.string().min(1).nullable().optional(),
  status: z.enum(["NEEDS_COVER", "ASSIGNED", "COMPLETED"]).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const { id } = await params;

    const assignment = await prisma.coverAssignment.findUnique({ where: { id } });
    if (!assignment || assignment.tenantId !== session.user.tenantId) throw new AuthError("Not found", 404);

    const body = patchSchema.parse(await req.json());

    if (body.coveringTeacherId) {
      const teacher = await prisma.user.findUnique({ where: { id: body.coveringTeacherId } });
      if (!teacher || teacher.tenantId !== session.user.tenantId) throw new AuthError("Teacher not found", 404);
    }

    // Assigning a covering teacher implicitly moves the need to ASSIGNED
    // (unless the caller explicitly set a status of their own), and clearing
    // the covering teacher drops it back to NEEDS_COVER.
    const status =
      body.status ?? (body.coveringTeacherId !== undefined ? (body.coveringTeacherId ? "ASSIGNED" : "NEEDS_COVER") : undefined);

    return prisma.coverAssignment.update({
      where: { id },
      data: { ...body, ...(status ? { status } : {}) },
      include: COVER_INCLUDE,
    });
  });
}
