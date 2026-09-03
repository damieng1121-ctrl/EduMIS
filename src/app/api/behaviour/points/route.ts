import { z } from "zod";
import { requireMisSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const CATEGORIES = ["ACHIEVEMENT", "EFFORT", "KINDNESS", "ATTENDANCE", "CONDUCT", "OTHER"] as const;

export async function GET(req: Request) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const pupilId = new URL(req.url).searchParams.get("pupilId");

    const where: Prisma.BehaviourPointsEntryWhereInput = {
      tenantId: session.user.tenantId,
      ...(pupilId ? { pupilId } : {}),
    };

    return prisma.behaviourPointsEntry.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        pupil: { select: { firstName: true, lastName: true } },
        awardedBy: { select: { name: true, email: true } },
      },
    });
  });
}

const createSchema = z.object({
  pupilId: z.string().min(1),
  date: z.coerce.date().optional(),
  points: z.number().int().refine((n) => n !== 0, "Points can't be zero"),
  category: z.enum(CATEGORIES).optional(),
  reason: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const body = createSchema.parse(await req.json());

    const pupil = await prisma.pupil.findUnique({ where: { id: body.pupilId } });
    if (!pupil || pupil.tenantId !== session.user.tenantId) throw new AuthError("Pupil not found", 404);

    return prisma.behaviourPointsEntry.create({
      data: {
        ...body,
        tenantId: session.user.tenantId,
        awardedById: session.user.id,
      },
      include: {
        pupil: { select: { firstName: true, lastName: true } },
        awardedBy: { select: { name: true, email: true } },
      },
    });
  });
}
