import type { TenantContext } from "@/core/tenancy"
import { getAuditLogRepository } from "@/modules/audit/infra/audit-log-repository"
import type {
  IAuditLogRepository,
  RecordAuditLogInput,
} from "@/modules/audit/domain/repositories/audit-log-repository.interface"
import type { DbClient } from "@/modules/audit/infra/db-client"

export type { RecordAuditLogInput, IAuditLogRepository }

/**
 * Điểm gọi chung cho mọi hành động duyệt (`YC-R4`). Nhận `db` tuỳ chọn để
 * use-case duyệt của module khác truyền transaction client của chính nó vào
 * — ghi audit cùng giao dịch với hành động, không phải một lời gọi rời.
 */
export function recordAuditLog(
  ctx: TenantContext,
  input: RecordAuditLogInput,
  db?: DbClient,
  repo?: IAuditLogRepository
) {
  const repository = repo ?? getAuditLogRepository(db)
  return repository.record(ctx, input)
}
