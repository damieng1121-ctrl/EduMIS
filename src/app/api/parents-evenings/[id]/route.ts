import { z } from "zod";
import { requireMisSession, AuthError } from "@/lib/session";
import { withApiErrors, isForeignKeyConstraintError } from "@/lib/api";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const { id } = await params;

    const event = await prisma.parentsEveningEvent.findUnique({ where: { id } });
    if (!event || event.tenantId !== session.user.tenantId) throw new AuthError("Not found", 404);

    const slots = await prisma.appointmentSlot.findMany({
      where: { tenantId: session.user.tenantId, eventId: id },
      orderBy: [{ teacherId: "asc" }, { startTime: "asc" }],
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        pupil: { select: { id: true, firstName: true, lastName: true } },
        guardian: { select: { id: true, name: true, email: true } },
      },
    });

    return { event, slots };
  });
}

const updateSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  date: z.coerce.date().optional(),
  startTime: z.string().min(1).max(5).optional(),
  endTime: z.string().min(1).max(5).optional(),
  slotMinutes: z.number().int().min(1).max(120).optional(),
  formGroupIds: z.array(z.string()).optional(),
  bookingOpensAt: z.coerce.date().optional().nullable(),
  bookingClosesAt: z.coerce.date().optional().nullable(),
  locationNote: z.string().max(500).optional().nullable(),
});

export async function PATCH(req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const { id } = await params;

    const event = await prisma.parentsEveningEvent.findUnique({ where: { id } });
    if (!event || event.tenantId !== session.user.tenantId) throw new AuthError("Not found", 404);

    const body = updateSchema.parse(await req.json());
    return prisma.parentsEveningEvent.update({ where: { id }, data: body });
  });
}

/**
 * AppointmentSlot cascades on event delete at the schema level, so a booked
 * slot doesn't raise a P2003 — it would just vanish along with the event,
 * silently destroying the parent's booking. Block that case up front with a
 * friendly 409 and only fall through to a hard delete once nothing would be
 * lost (the P2003 catch below is a defensive fallback, not the primary check).
 */
export async function DELETE(_req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const { id } = await params;

    const event = await prisma.parentsEveningEvent.findUnique({ where: { id } });
    if (!event || event.tenantId !== session.user.tenantId) throw new AuthError("Not found", 404);

    const bookedCount = await prisma.appointmentSlot.count({
      where: { tenantId: session.user.tenantId, eventId: id, status: "BOOKED" },
    });
    if (bookedCount > 0) {
      throw new AuthError(
        "This event has parent bookings — cancel or reassign them before deleting the event.",
        409,
      );
    }

    try {
      await prisma.parentsEveningEvent.delete({ where: { id } });
    } catch (err) {
      if (isForeignKeyConstraintError(err)) {
        throw new AuthError(
          "This event has parent bookings — cancel or reassign them before deleting the event.",
          409,
        );
      }
      throw err;
    }

    return { ok: true };
  });
}
