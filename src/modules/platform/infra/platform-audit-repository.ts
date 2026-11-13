import type { InputJsonValue, platform_audit_logs } from "./entities"

import { prisma } from "@/core/tenancy/infra/prisma"
import type { PlatformContext } from "@/core/platform/platform-context"

export type RecordPlatformAuditInput = {
  action: string
  entityType: string
  entityId: string
  before?: unknown
  after?: unknown
}

/**
 * Nhật ký cho hành động KHÔNG thuộc một tổ chức cụ thể (xem sức khoẻ hệ
 * thống, gán/thu vai vận hành). Đối xứng với `AuditLogRepository` của
 * tenant nhưng nhận `PlatformContext` — không route nào ghi vào
 * `audit_logs` thường bằng dữ liệu từ đây, vì `audit_logs.organization_id`
 * là bắt buộc (D-N3: hai bảng nhật ký tách riêng, không mượn nhau).
 */
export async function recordPlatformAuditLog(
  pctx: PlatformContext,
  input: RecordPlatformAuditInput
): Promise<platform_audit_logs> {
  return prisma.platform_audit_logs.create({
    data: {
      user_id: pctx.userId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      before: (input.before ?? null) as InputJsonValue,
      after: (input.after ?? null) as InputJsonValue,
    },
  })
}

export class PlatformAuditRepository {
  list(limit = 100): Promise<platform_audit_logs[]> {
    return prisma.platform_audit_logs.findMany({
      orderBy: { created_at: "desc" },
      take: limit,
    })
  }
}
