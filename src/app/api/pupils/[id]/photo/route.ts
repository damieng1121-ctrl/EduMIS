import { requireMisSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { deleteUpload, readUpload, savePupilPhoto, UploadTooLargeError } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const CONTENT_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

async function loadOwnPupil(tenantId: string, id: string) {
  const pupil = await prisma.pupil.findUnique({ where: { id } });
  if (!pupil || pupil.tenantId !== tenantId) throw new AuthError("Not found", 404);
  return pupil;
}

/** No auth-error distinction from a genuinely missing photo — both just 404, so a photo URL never leaks whether a pupil id exists to an unauthenticated caller. */
export async function GET(_req: Request, { params }: Params) {
  const session = await requireMisSession().catch(() => null);
  if (!session) return new Response("Not authenticated", { status: 401 });
  const { id } = await params;

  const pupil = await prisma.pupil.findUnique({ where: { id }, select: { tenantId: true, photoUrl: true } });
  if (!pupil || pupil.tenantId !== session.user.tenantId || !pupil.photoUrl) {
    return new Response("No photo set", { status: 404 });
  }

  const bytes = await readUpload(pupil.photoUrl).catch(() => null);
  if (!bytes) return new Response("File not found", { status: 404 });

  const ext = pupil.photoUrl.split(".").pop()?.toLowerCase() ?? "";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function POST(req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const { id } = await params;
    const pupil = await loadOwnPupil(session.user.tenantId, id);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AuthError("No file provided", 400);
    if (!ALLOWED_TYPES.has(file.type)) throw new AuthError("Photo must be a PNG, JPEG, or WebP image", 400);

    if (pupil.photoUrl) await deleteUpload(pupil.photoUrl);

    let saved;
    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      saved = await savePupilPhoto(session.user.tenantId, id, file.name, bytes);
    } catch (err) {
      if (err instanceof UploadTooLargeError) throw new AuthError(err.message, 413);
      throw err;
    }

    const updated = await prisma.pupil.update({ where: { id }, data: { photoUrl: saved.key } });

    await audit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "pupil.photo_updated",
      entityType: "Pupil",
      entityId: id,
    });

    return { photoUrl: updated.photoUrl };
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  return withApiErrors(async () => {
    const session = await requireMisSession();
    const { id } = await params;
    const pupil = await loadOwnPupil(session.user.tenantId, id);

    if (pupil.photoUrl) await deleteUpload(pupil.photoUrl);
    await prisma.pupil.update({ where: { id }, data: { photoUrl: null } });

    await audit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "pupil.photo_removed",
      entityType: "Pupil",
      entityId: id,
    });

    return { ok: true };
  });
}
