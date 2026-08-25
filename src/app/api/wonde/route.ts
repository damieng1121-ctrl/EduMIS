import { z } from "zod";
import { requireFeatureSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  return withApiErrors(async () => {
    const session = await requireFeatureSession("WONDE");
    const connection = await prisma.wondeConnection.findUnique({
      where: { tenantId: session.user.tenantId },
    });
    // Never return the decrypted token — just whether one is set.
    return {
      wondeSchoolId: connection?.wondeSchoolId ?? null,
      hasApiToken: Boolean(connection?.apiTokenEncrypted),
      syncEnabled: connection?.syncEnabled ?? false,
      lastSyncedAt: connection?.lastSyncedAt ?? null,
      lastSyncStatus: connection?.lastSyncStatus ?? null,
    };
  });
}

const bodySchema = z.object({
  wondeSchoolId: z.string().max(100).optional(),
  apiToken: z.string().min(1).max(500).optional(),
  syncEnabled: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  return withApiErrors(async () => {
    const session = await requireFeatureSession("WONDE");
    if (!isAdmin(session.user.role)) throw new AuthError("Only admins can update the Wonde connection", 403);
    const body = bodySchema.parse(await req.json());

    const connection = await prisma.wondeConnection.upsert({
      where: { tenantId: session.user.tenantId },
      create: {
        tenantId: session.user.tenantId,
        wondeSchoolId: body.wondeSchoolId,
        apiTokenEncrypted: body.apiToken ? encrypt(body.apiToken) : undefined,
        syncEnabled: body.syncEnabled ?? false,
      },
      update: {
        ...(body.wondeSchoolId !== undefined ? { wondeSchoolId: body.wondeSchoolId } : {}),
        ...(body.apiToken ? { apiTokenEncrypted: encrypt(body.apiToken) } : {}),
        ...(body.syncEnabled !== undefined ? { syncEnabled: body.syncEnabled } : {}),
      },
    });

    // Echo back the same shape as GET — never the decrypted token.
    return {
      wondeSchoolId: connection.wondeSchoolId,
      hasApiToken: Boolean(connection.apiTokenEncrypted),
      syncEnabled: connection.syncEnabled,
      lastSyncedAt: connection.lastSyncedAt,
      lastSyncStatus: connection.lastSyncStatus,
    };
  });
}
