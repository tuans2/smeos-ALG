/**
 * Bộ quét: đơn bị tự huỷ vì quá hạn thanh toán → lead cứu đơn cho Sale
 * (`docs/kien-truc/KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §3.1 mục 7). Chạy lặp an toàn: đơn đã có lead
 * cứu đơn thì bỏ qua; khách đã có lead đang mở thì không tạo thêm.
 *
 * Lý do huỷ đọc từ hằng số của luồng huỷ hiện hành (chỉ import, không sửa luồng huỷ).
 */

import { log } from "@/core/observability/log"
import { AUTO_CANCEL_REASON, PAYMENT_TIMEOUT_REASON } from "@/modules/greeting-card/domain/background-sweep"
import { RECOVERY_BATCH, RECOVERY_LOOKBACK_MS, planRecoveryLead } from "../domain/lead-recovery"
import { LeadRecoveryRepository } from "../infra/lead-recovery-repository"

export const PAYMENT_TIMEOUT_CANCEL_REASONS = [AUTO_CANCEL_REASON, PAYMENT_TIMEOUT_REASON] as const

export interface LeadRecoveryResult {
  scanned: number
  created: number
  skipped: number
}

export async function recoverPaymentTimeoutLeads(
  now = new Date(),
  repo: Pick<LeadRecoveryRepository, "listCandidates" | "createLead"> = new LeadRecoveryRepository(),
): Promise<LeadRecoveryResult> {
  const since = new Date(now.getTime() - RECOVERY_LOOKBACK_MS)
  const candidates = await repo.listCandidates(since, PAYMENT_TIMEOUT_CANCEL_REASONS, RECOVERY_BATCH)
  const result: LeadRecoveryResult = { scanned: candidates.length, created: 0, skipped: 0 }
  for (const c of candidates) {
    const plan = planRecoveryLead(c)
    if (plan.action === "SKIP") {
      result.skipped += 1
      continue
    }
    try {
      await repo.createLead(plan.row)
      result.created += 1
    } catch (error: unknown) {
      // Một đơn lỗi không chặn cả lượt; lượt sau quét lại (chưa có lead cứu đơn).
      result.skipped += 1
      log.warn("acquisition.lead_recovery_failed", {
        organizationId: c.organizationId,
        feature: "acquisition",
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return result
}
