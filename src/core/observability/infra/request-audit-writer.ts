import { prisma } from "@/core/tenancy/infra/prisma"

export type RequestAuditEntry = {
  organizationId: string
  userId: string
  action: string
  entityType: string
  entityId: string
  after: Record<string, unknown>
  ip: string | null
  userAgent: string | null
}

/**
 * Ghi một dòng `audit_logs` cho thao tác ở tầng HTTP (thao tác ghi thành công, lần bị chặn vì thiếu
 * quyền) — checklist ALG 1.15, 1.17. `organizationId`/`userId` lấy từ phiên đã xác thực.
 */
export async function writeRequestAudit(entry: RequestAuditEntry): Promise<void> {
  await prisma.audit_logs.create({
    data: {
      organization_id: entry.organizationId,
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      after: entry.after as never,
      ip: entry.ip,
      user_agent: entry.userAgent,
    },
  })
}
