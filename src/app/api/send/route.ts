import { z } from "zod";
import { requireMisSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

const targetSchema = z.object({
  target: z.string().min(1).max(1000),
  progress: z.string().max(2000),
  reviewDate: z.string().max(40),
});

export async function GET(req: Request) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const pupilId = new URL(req.url).searchParams.get("pupilId");

    const where: Prisma.SendPlanWhereInput = {
      tenantId: session.user.tenantId,
      ...(pupilId ? { pupilId } : {}),
    };

    const plans = await prisma.sendPlan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        pupil: { select: { firstName: true, lastName: true, sendStatus: true } },
        createdBy: { select: { name: true, email: true } },
      },
    });

    // A pupilId-scoped fetch is one person's SEND plan(s) being read (from
    // their pupil profile) — worth its own entry. A whole-register fetch
    // (the SEND admin list) is logged once with a count, not once per plan,
    // so browsing the register doesn't flood the log with near-duplicates.
    await audit(
      pupilId
        ? { tenantId: session.user.tenantId, userId: session.user.id, action: "send.viewed", entityType: "Pupil", entityId: pupilId }
        : { tenantId: session.user.tenantId, userId: session.user.id, action: "send.register_viewed", entityType: "SendPlan", metadata: { count: plans.length } },
    );

    return plans;
  });
}

const createSchema = z.object({
  pupilId: z.string().min(1),
  status: z.enum(["NONE", "SEND_SUPPORT", "EHCP"]),
  primaryNeed: z.enum(["COMMUNICATION", "COGNITION", "SEMH", "SENSORY_PHYSICAL"]).optional(),
  description: z.string().min(1).max(4000),
  targets: z.array(targetSchema).optional(),
  externalAgencies: z.string().max(2000).optional(),
  reviewDate: z.coerce.date().optional(),
});

export async function POST(req: Request) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const body = createSchema.parse(await req.json());

    const pupil = await prisma.pupil.findUnique({ where: { id: body.pupilId } });
    if (!pupil || pupil.tenantId !== session.user.tenantId) throw new AuthError("Pupil not found", 404);

    const { targets, ...rest } = body;

    const plan = await prisma.sendPlan.create({
      data: {
        ...rest,
        targets: targets ?? [],
        tenantId: session.user.tenantId,
        createdById: session.user.id,
      },
      include: {
        pupil: { select: { firstName: true, lastName: true, sendStatus: true } },
        createdBy: { select: { name: true, email: true } },
      },
    });

    if (body.status !== "NONE") {
      await prisma.pupil.update({ where: { id: body.pupilId }, data: { sendStatus: body.status } });
    }

    await audit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "send.created",
      entityType: "SendPlan",
      entityId: plan.id,
      metadata: { pupilId: body.pupilId, status: body.status },
    });

    return plan;
  });
}
