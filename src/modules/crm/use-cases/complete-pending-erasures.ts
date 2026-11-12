import { log } from "@/core/observability/log"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"

import { finishPendingErasure, listCompletableErasures } from "../infra/data-subject-request-repository"

/** Trần mỗi lượt quét 5 phút — dư thì lượt sau làm tiếp. */
export const PENDING_ERASURE_BATCH = 50
const SYSTEM_ACTOR = "system:dsr-erasure"

function systemContext(organizationId: string): TenantContext {
  return { organizationId, workspaceId: "", userId: SYSTEM_ACTOR, branchId: null, capabilities: new Set() }
}

/**
 * Hoàn tất yêu cầu xoá dữ liệu khách đang chờ đơn (audit User Journey UJ-28, PO 12/11/2026 UQ15): khi mọi đơn của
 * khách đã hoàn tất / huỷ, xoá nốt dữ liệu giao nhận còn giữ và đóng yêu cầu — một giao dịch mỗi yêu cầu, có nhật ký.
 * Lỗi một yêu cầu không chặn yêu cầu khác; lỗi cả lượt → `null` (không làm hỏng lượt quét chung).
 */
export async function completePendingErasures(now: Date = new Date()): Promise<{ completed: number; failed: number } | null> {
  try {
    const due = await listCompletableErasures(PENDING_ERASURE_BATCH)
    let completed = 0
    let failed = 0
    for (const r of due) {
      try {
        const done = await finishPendingErasure(r.organizationId, r.id, r.customerId, { by: SYSTEM_ACTOR, at: now })
        if (!done) continue
        completed++
        await recordAuditLog(systemContext(r.organizationId), {
          action: "crm.data_subject_erased", entityType: "data_subject_requests", entityId: r.id,
          after: { type: "ERASE", status: "COMPLETED", customer_id: r.customerId, result: done },
        })
      } catch (error) {
        failed++
        log.warn("crm.pending_erasure_failed", { requestId: r.id, error: error instanceof Error ? error.message : String(error) })
      }
    }
    return { completed, failed }
  } catch (error) {
    log.error("sweep.pending_erasure_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}
