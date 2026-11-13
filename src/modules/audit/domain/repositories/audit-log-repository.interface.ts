/**
 * IAuditLogRepository — Port Interface cho Nhật ký Kiểm toán (Audit Logs).
 *
 * Đặt tại domain/repositories/ theo chuẩn Clean Architecture (Zero ORM).
 */

import type { TenantContext } from "@/core/tenancy"
import type { audit_logs } from "@/modules/audit/infra/entities"

export interface RecordAuditLogInput {
  action: string
  entityType: string
  entityId: string
  before?: unknown
  after?: unknown
  ip?: string | null
  userAgent?: string | null
}

/** Bộ lọc phía máy chủ cho tra cứu nhật ký (checklist ALG 1.17). */
export interface AuditLogFilter {
  /** Khớp đầu mã hành động, vd. `member.` hay `security.access_denied`. */
  actionPrefix?: string | undefined
  entityType?: string | undefined
  entityId?: string | undefined
  userId?: string | undefined
  from?: Date | undefined
  to?: Date | undefined
}

export interface IAuditLogRepository {
  record(ctx: TenantContext, input: RecordAuditLogInput): Promise<audit_logs>
  list(
    ctx: TenantContext,
    options: { limit: number; cursor?: string | null; filter?: AuditLogFilter | undefined }
  ): Promise<audit_logs[]>
}
