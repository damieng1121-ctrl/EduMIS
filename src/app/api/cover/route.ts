import { z } from "zod";
import { requireMisSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { Prisma, Weekday } from "@prisma/client";

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

/** JS Date#getDay() (0=Sunday..6=Saturday) mapped onto the school week the Weekday enum covers. */
const JS_DAY_TO_WEEKDAY: Record<number, Weekday | undefined> = {
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
};

export async function GET(req: Request) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const dateParam = new URL(req.url).searchParams.get("date");

    const where: Prisma.CoverAssignmentWhereInput = { tenantId: session.user.tenantId };
    if (dateParam) {
      const day = new Date(dateParam);
      if (Number.isNaN(day.getTime())) throw new AuthError("Invalid date", 400);
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.date = { gte: start, lt: end };
    }

    return prisma.coverAssignment.findMany({
      where,
      orderBy: [{ date: "asc" }, { timetableSlot: { periodNumber: "asc" } }],
      include: COVER_INCLUDE,
    });
  });
}

// Two shapes in one endpoint: a single explicit cover need (`timetableSlotId`
// given), or "mark this teacher absent all day" (omit it) which fans out to
// every TimetableSlot they normally teach on that date's weekday — the
// one-action-not-one-call-per-lesson helper the cover module needs to be
// genuinely useful.
const createSchema = z.object({
  absentTeacherId: z.string().min(1),
  date: z.coerce.date(),
  timetableSlotId: z.string().min(1).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const body = createSchema.parse(await req.json());

    const absentTeacher = await prisma.user.findUnique({ where: { id: body.absentTeacherId } });
    if (!absentTeacher || absentTeacher.tenantId !== session.user.tenantId) {
      throw new AuthError("Teacher not found", 404);
    }

    if (body.timetableSlotId) {
      const slot = await prisma.timetableSlot.findUnique({ where: { id: body.timetableSlotId } });
      if (!slot || slot.tenantId !== session.user.tenantId) throw new AuthError("Timetable slot not found", 404);

      const assignment = await prisma.coverAssignment.upsert({
        where: { timetableSlotId_date: { timetableSlotId: slot.id, date: body.date } },
        create: {
          tenantId: session.user.tenantId,
          timetableSlotId: slot.id,
          date: body.date,
          absentTeacherId: body.absentTeacherId,
          notes: body.notes,
        },
        update: {},
        include: COVER_INCLUDE,
      });
      return { created: [assignment], skipped: 0 };
    }

    // Whole-day mode: find every slot this teacher normally teaches on this
    // date's weekday and raise a NEEDS_COVER need for each, skipping any
    // that already exist for that slot+date.
    const weekday = JS_DAY_TO_WEEKDAY[body.date.getDay()];
    if (!weekday) throw new AuthError("Cover can only be generated for a school weekday (Monday-Friday)", 400);

    const slots = await prisma.timetableSlot.findMany({
      where: { tenantId: session.user.tenantId, teacherId: body.absentTeacherId, dayOfWeek: weekday },
    });

    const existing = await prisma.coverAssignment.findMany({
      where: { tenantId: session.user.tenantId, date: body.date, timetableSlotId: { in: slots.map((s) => s.id) } },
      select: { timetableSlotId: true },
    });
    const existingSlotIds = new Set(existing.map((e) => e.timetableSlotId));
    const toCreate = slots.filter((s) => !existingSlotIds.has(s.id));

    if (toCreate.length > 0) {
      await prisma.coverAssignment.createMany({
        data: toCreate.map((s) => ({
          tenantId: session.user.tenantId,
          timetableSlotId: s.id,
          date: body.date,
          absentTeacherId: body.absentTeacherId,
          notes: body.notes,
        })),
      });
    }

    const created = await prisma.coverAssignment.findMany({
      where: { tenantId: session.user.tenantId, date: body.date, timetableSlotId: { in: toCreate.map((s) => s.id) } },
      include: COVER_INCLUDE,
    });

    return { created, skipped: slots.length - toCreate.length };
  });
}
