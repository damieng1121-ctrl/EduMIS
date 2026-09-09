import { z } from "zod";
import { requireParentSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ pupilId: string }> };

const bodySchema = z.object({ clubId: z.string().min(1) });

async function assertGuardianLink(pupilId: string, guardianId: string, tenantId: string) {
  const link = await prisma.pupilGuardian.findUnique({
    where: { pupilId_guardianId: { pupilId, guardianId } },
  });
  if (!link || link.tenantId !== tenantId) throw new AuthError("Not found", 404);
}

export async function POST(req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireParentSession();
    const { pupilId } = await params;

    await assertGuardianLink(pupilId, session.user.id, session.user.tenantId);

    const { clubId } = bodySchema.parse(await req.json());

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club || club.tenantId !== session.user.tenantId) throw new AuthError("Not found", 404);

    if (club.capacity) {
      const activeCount = await prisma.clubMembership.count({ where: { clubId, status: "ACTIVE" } });
      const existing = await prisma.clubMembership.findUnique({ where: { clubId_pupilId: { clubId, pupilId } } });
      if (!existing && activeCount >= club.capacity) {
        throw new AuthError("This club is full", 409);
      }
    }

    return prisma.clubMembership.upsert({
      where: { clubId_pupilId: { clubId, pupilId } },
      create: { tenantId: session.user.tenantId, clubId, pupilId, status: "ACTIVE" },
      update: { status: "ACTIVE" },
    });
  });
}

export async function DELETE(req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireParentSession();
    const { pupilId } = await params;

    await assertGuardianLink(pupilId, session.user.id, session.user.tenantId);

    const { searchParams } = new URL(req.url);
    let clubId = searchParams.get("clubId");
    if (!clubId) {
      const body = await req.json().catch(() => ({}));
      clubId = bodySchema.parse(body).clubId;
    }

    const membership = await prisma.clubMembership.findUnique({ where: { clubId_pupilId: { clubId, pupilId } } });
    if (!membership || membership.tenantId !== session.user.tenantId) throw new AuthError("Not found", 404);

    await prisma.clubMembership.delete({ where: { id: membership.id } });

    // Promote the longest-waiting waitlisted pupil into the freed ACTIVE slot, if any.
    if (membership.status === "ACTIVE") {
      const nextInLine = await prisma.clubMembership.findFirst({
        where: { clubId, status: "WAITLIST" },
        orderBy: { joinedAt: "asc" },
      });
      if (nextInLine) {
        await prisma.clubMembership.update({ where: { id: nextInLine.id }, data: { status: "ACTIVE" } });
      }
    }

    return { ok: true };
  });
}
