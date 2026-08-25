import { z } from "zod";
import { requireFeatureSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";

const YEAR_GROUPS = [
  "NURSERY", "RECEPTION", "YEAR_1", "YEAR_2", "YEAR_3", "YEAR_4", "YEAR_5",
  "YEAR_6", "YEAR_7", "YEAR_8", "YEAR_9", "YEAR_10", "YEAR_11", "YEAR_12", "YEAR_13",
] as const;

// Mirrors ParsedCtfPupil from src/lib/ctf.ts, plus the two fields a CTF
// doesn't carry (yearGroup/formGroupId) that the admin picks during review.
// Every ParsedCtfPupil field the parser couldn't find in the XML comes back
// as `null` (not `undefined`) — so these must accept null too, or feeding
// the parse endpoint's own output straight back in (the obvious way to use
// this API) fails validation. Pupil's columns are all nullable, so Prisma
// is happy to receive null directly — no need to convert to undefined.
const confirmSchema = z.object({
  upn: z.string().max(20).nullable().optional(),
  formerUpn: z.string().max(20).nullable().optional(),
  firstName: z.string().min(1).max(100),
  middleNames: z.string().max(100).nullable().optional(),
  lastName: z.string().min(1).max(100),
  dob: z.coerce.date(),
  gender: z.enum(["MALE", "FEMALE"]),
  ethnicity: z.string().max(100).nullable().optional(),
  homeLanguage: z.string().max(100).nullable().optional(),
  nationality: z.string().max(100).nullable().optional(),
  addressLine1: z.string().max(200).nullable().optional(),
  addressLine2: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  postcode: z.string().max(20).nullable().optional(),
  freeSchoolMeals: z.boolean().optional(),
  yearGroup: z.enum(YEAR_GROUPS),
  formGroupId: z.string().min(1).optional(),
});

/** Second step of CTF import — the admin has reviewed the parsed data, this actually creates the Pupil. */
export async function POST(req: Request) {
  return withApiErrors(async () => {
    const session = await requireFeatureSession("CTF_EXCHANGE");
    if (!isAdmin(session.user.role)) throw new AuthError("This area is only available to school admins", 403);

    const body = confirmSchema.parse(await req.json());

    const pupil = await prisma.pupil.create({
      data: { ...body, tenantId: session.user.tenantId },
    });

    await prisma.ctfExchange.create({
      data: {
        tenantId: session.user.tenantId,
        direction: "IMPORT",
        pupilName: `${pupil.firstName} ${pupil.lastName}`,
        upn: pupil.upn,
        fileName: "(uploaded CTF)",
        performedById: session.user.id,
      },
    });

    return pupil;
  });
}
