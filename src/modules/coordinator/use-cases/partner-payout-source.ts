/**
 * Số tiền công chuẩn của một đơn Điều phối (PO 12/11/2026, audit BL-22): phí gia công lúc chi nhánh nhận đơn trừ khấu
 * trừ (`order_coordinations.metadata.subcontract_dispatch.craftFee`), không có thì số đã thoả thuận lúc giao xưởng.
 */
import { craftFeePayable, type CraftFeeDeduction } from "@/modules/greeting-card/domain/craft-fee-policy"
import { referencePayoutVnd } from "../domain/partner-payout"

export function craftFeePayableOf(coordinationMetadata: unknown): number | null {
  const meta = coordinationMetadata && typeof coordinationMetadata === "object" ? (coordinationMetadata as Record<string, unknown>) : {}
  const sub = meta.subcontract_dispatch as { craftFee?: { finalVnd?: unknown; deductions?: unknown } } | undefined
  const fee = sub?.craftFee
  if (!fee || typeof fee.finalVnd !== "number" || !Number.isFinite(fee.finalVnd)) return null
  const deductions = Array.isArray(fee.deductions) ? (fee.deductions as CraftFeeDeduction[]).filter((d) => typeof d?.amountVnd === "number") : []
  return craftFeePayable(fee.finalVnd, deductions)
}

export function orderReferencePayoutVnd(order: { coordination: { metadata: unknown; partner_payout_vnd: unknown } | null }): number | null {
  const c = order.coordination
  const agreed = c?.partner_payout_vnd
  return referencePayoutVnd({ craftFeePayableVnd: craftFeePayableOf(c?.metadata), agreedVnd: agreed === null || agreed === undefined ? null : Number(agreed) })
}
