/**
 * Điều kiện khấu trừ phí gia công (PO 12/11/2026, audit BL-24) — thuần.
 *
 * Chụp lúc gửi lời mời (chi nhánh nhận đơn theo đúng điều kiện này). Khi xét trừ, lấy phía **có lợi cho chi nhánh**
 * giữa điều kiện đã chụp và cài đặt hiện tại: tiệm tắt trừ, hạ % hay tăng ân hạn thì áp ngay cho cả đơn đang làm; tăng %
 * hay bật lại thì chỉ đơn gửi lời mời sau đó chịu. Đơn cũ chưa có bản chụp thì theo cài đặt hiện tại như trước.
 */
import type { CraftFeePolicy } from "./craft-fee-policy"

export interface CraftFeeDeductionTerms {
  enabled: boolean
  latePercent: number
  complaintPercent: number
  lateGraceMinutes: number
}

export function deductionTermsOf(policy: CraftFeePolicy): CraftFeeDeductionTerms {
  return {
    enabled: policy.deductionsEnabled,
    latePercent: policy.lateDeliveryDeductionPercent,
    complaintPercent: policy.complaintDeductionPercent,
    lateGraceMinutes: policy.lateGraceMinutes,
  }
}

export function effectiveDeductionTerms(snapshot: CraftFeeDeductionTerms | undefined, current: CraftFeeDeductionTerms): CraftFeeDeductionTerms {
  if (!snapshot) return current
  return {
    enabled: snapshot.enabled && current.enabled,
    latePercent: Math.min(snapshot.latePercent, current.latePercent),
    complaintPercent: Math.min(snapshot.complaintPercent, current.complaintPercent),
    lateGraceMinutes: Math.max(snapshot.lateGraceMinutes, current.lateGraceMinutes),
  }
}
