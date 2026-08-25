import { withApiErrors } from "@/lib/api";
import { requireFeatureSession, AuthError } from "@/lib/session";
import { isAdmin } from "@/lib/roles";
import { parseCtfXml } from "@/lib/ctf";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB — a single-pupil CTF is a few KB; this just guards against an accidental wrong file

/** Parses an uploaded CTF file and hands the result back for review — never writes to the database itself. */
export async function POST(req: Request) {
  return withApiErrors(async () => {
    const session = await requireFeatureSession("CTF_EXCHANGE");
    if (!isAdmin(session.user.role)) throw new AuthError("This area is only available to school admins", 403);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AuthError("No file provided", 400);
    if (file.size > MAX_SIZE) throw new AuthError("That file is too large to be a CTF export", 400);

    const text = await file.text();
    const result = parseCtfXml(text);
    if ("error" in result) throw new AuthError(result.error, 400);

    return result;
  });
}
