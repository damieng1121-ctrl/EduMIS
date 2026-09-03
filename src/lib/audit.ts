import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type AuditEntry = {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Records who did what to which record — the "who looked at this child's
 * file, and when" trail KCSIE and UK GDPR Article 9 both expect for special
 * category data (SEND, safeguarding, the SCR). Never let a logging failure
 * turn into a 500 for the person just trying to view a record: swallow and
 * report the error instead of throwing.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (err) {
    console.error("audit log write failed", err);
  }
}
