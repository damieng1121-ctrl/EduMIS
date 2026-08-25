import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFeatureSession, AuthError } from "@/lib/session";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";
import { buildCtfXml } from "@/lib/ctf";

const querySchema = z.object({ pupilId: z.string().min(1) });

export async function GET(req: Request) {
  let session;
  try {
    session = await requireFeatureSession("CTF_EXCHANGE");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  if (!isAdmin(session.user.role)) {
    return NextResponse.json({ error: "This area is only available to school admins" }, { status: 403 });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Missing pupilId" }, { status: 400 });

  const [pupil, tenant] = await Promise.all([
    prisma.pupil.findFirst({ where: { id: parsed.data.pupilId, tenantId: session.user.tenantId } }),
    prisma.tenant.findUniqueOrThrow({ where: { id: session.user.tenantId } }),
  ]);
  if (!pupil) return NextResponse.json({ error: "Pupil not found" }, { status: 404 });

  const xml = buildCtfXml(pupil, { name: tenant.name, urn: tenant.urn });
  const fileName = `${pupil.upn ?? pupil.id}_CTF.xml`;

  await prisma.ctfExchange.create({
    data: {
      tenantId: session.user.tenantId,
      direction: "EXPORT",
      pupilName: `${pupil.firstName} ${pupil.lastName}`,
      upn: pupil.upn,
      fileName,
      performedById: session.user.id,
    },
  });

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
