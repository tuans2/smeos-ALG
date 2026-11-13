/**
 * Khoản trừ phí gia công (PO 22/10/2026): giao trễ so với khung giờ hẹn, và khiếu nại do Điều phối
 * ghi nhận. Mặc định 0%. Mỗi loại trừ tối đa một lần cho một đơn.
 * PO 12/11/2026 (audit BL-24): có công tắc bật/tắt; điều kiện chụp lúc gửi lời mời, xét theo phía có lợi cho chi nhánh
 * (`craft-fee-deduction-terms.ts`); giao trễ chỉ tính sau thời gian ân hạn.
 */

import { craftFeeDeduction, type CraftFeeDeductionKind, type CraftFeePolicy } from "../domain/craft-fee-policy"
import { deductionTermsOf, effectiveDeductionTerms, type CraftFeeDeductionTerms } from "../domain/craft-fee-deduction-terms"
import type { CraftFeeRecord, SubcontractOrderState } from "../domain/subcontract-order"
import { deliveryDeadlineMs } from "@/modules/orders/domain/delivery-slot"
import { craftFeePolicyOf, type ICraftFeeFactsStore } from "./suggest-craft-fee"

type Metadata = Record<string, unknown>
export type MetadataTransform = (meta: Metadata) => Metadata

const identity: MetadataTransform = (meta) => meta

/** Thêm một khoản trừ vào `subcontract_dispatch.craftFee`; đã có khoản cùng loại hoặc % = 0 thì giữ nguyên. */
export function withCraftFeeDeduction(
  meta: Metadata,
  policy: CraftFeePolicy,
  kind: CraftFeeDeductionKind,
  reason: string,
  at: Date
): { meta: Metadata; applied: boolean } {
  const sub = meta.subcontract_dispatch as SubcontractOrderState | undefined
  if (!sub) return { meta, applied: false }
  const feeVnd = sub.craftFee?.finalVnd ?? sub.subcontractPriceVnd ?? 0
  const record: CraftFeeRecord = sub.craftFee ?? { suggestedVnd: feeVnd, finalVnd: feeVnd, method: policy.method, lines: [], deductions: [] }
  if (record.deductions.some((d) => d.kind === kind)) return { meta, applied: false }
  const terms = termsFor(sub, policy)
  if (!terms.enabled) return { meta, applied: false }
  const termsPolicy = { ...policy, lateDeliveryDeductionPercent: terms.latePercent, complaintDeductionPercent: terms.complaintPercent }
  const deduction = craftFeeDeduction(termsPolicy, feeVnd, kind, reason, at)
  if (!deduction) return { meta, applied: false }
  const craftFee = { ...record, deductions: [...record.deductions, deduction] }
  return { meta: { ...meta, subcontract_dispatch: { ...sub, craftFee } }, applied: true }
}

/** Phút trễ so với giờ hẹn; khung giờ không nêu giờ cụ thể → 0 (không có giờ hẹn thì không có "trễ" — audit BL-24). */
export function lateMinutes(deliveryWindow: Record<string, unknown>, deliveredAt: Date): number {
  const due = deliveryDeadlineMs(
    typeof deliveryWindow.date === "string" ? deliveryWindow.date : null,
    typeof deliveryWindow.timeSlot === "string" ? deliveryWindow.timeSlot : null
  )
  return due === null ? 0 : Math.floor((deliveredAt.getTime() - due) / 60_000)
}

/**
 * Chuẩn bị (ngoài khoá) phép trừ giao trễ cho bước giao xong; trả hàm áp lên metadata bên trong khoá.
 * Đơn không trễ, không có khung giờ hoặc tiệm để 0% → hàm không đổi gì.
 */
export async function prepareLateDeliveryDeduction(
  organizationId: string,
  orderId: string,
  store: ICraftFeeFactsStore,
  deliveredAt = new Date()
): Promise<MetadataTransform> {
  const facts = await store.loadFacts(organizationId, orderId)
  if (!facts) return identity
  const late = lateMinutes(facts.deliveryWindow, deliveredAt)
  const policy = craftFeePolicyOf(facts.settings)
  if (late <= 0 || !policy.deductionsEnabled || policy.lateDeliveryDeductionPercent <= 0) return identity
  return (meta) => {
    // Ân hạn đọc trong khoá, theo điều kiện đơn đã chụp (BL-24)
    const sub = meta.subcontract_dispatch as SubcontractOrderState | undefined
    if (!sub || late <= termsFor(sub, policy).lateGraceMinutes) return meta
    return withCraftFeeDeduction(meta, policy, "LATE_DELIVERY", `Giao trễ ${late} phút so với giờ hẹn`, deliveredAt).meta
  }
}

/** Điều kiện khấu trừ có hiệu lực cho đơn: bản chụp lúc gửi lời mời, xét cùng cài đặt hiện tại. */
export function termsFor(sub: SubcontractOrderState, policy: CraftFeePolicy): CraftFeeDeductionTerms {
  return effectiveDeductionTerms(sub.craftFee?.deductionTerms, deductionTermsOf(policy))
}
