import { requireTenantSession, AuthError } from "@/lib/session";
import { withApiErrors } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/roles";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  return withApiErrors(async () => {
    const session = await requireTenantSession();
    if (!isAdmin(session.user.role)) throw new AuthError("Admins only", 403);

    const url = new URL(req.url);
    const entityType = url.searchParams.get("entityType");
    const action = url.searchParams.get("action");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);

    const where: Prisma.AuditLogWhereInput = {
      tenantId: session.user.tenantId,
      ...(entityType ? { entityType } : {}),
      ...(action ? { action } : {}),
    };

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { entries, total, page, pageSize: PAGE_SIZE };
  });
}
