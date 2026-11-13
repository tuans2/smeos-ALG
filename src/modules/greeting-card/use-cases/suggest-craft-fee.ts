/**
 * Gợi ý phí gia công cho một đơn theo cấu hình của cửa hàng (`settings.craft_fee_policy`) và số
 * mặc định của ngành. Dùng chung mọi ngành: ngành chỉ khai nhãn và số khởi điểm (PO 22/10/2026).
 */

import { notFound, unprocessable } from "@/core/http/errors"
import { deductionTermsOf } from "../domain/craft-fee-deduction-terms"
import type { CraftComplexity } from "@/modules/organization/domain/industry-plugin-contract"
import { bomMaterialCostVnd } from "@/modules/products/domain/bom"

import { CRAFT_FEE_POLICY_KEY, computeCraftFee, craftFeeOverrideAllowed, craftFeeSpecOf, parseCraftFeePolicy, type CraftFeeInput, type CraftFeeLine, type CraftFeePolicy } from "../domain/craft-fee-policy"
import { parseDeliveryTimestampMs } from "../domain/subcontract-countdown"
import type { CraftFeeRecord } from "../domain/subcontract-order"

export { CRAFT_FEE_POLICY_KEY, craftFeePolicyOf, craftFeeSpecOf } from "../domain/craft-fee-policy"

export interface CraftFeeOrderFacts {
  totalVnd: number
  vatAmountVnd: number
  pricingRef: Record<string, unknown>
  deliveryWindow: Record<string, unknown>
  settings: Record<string, unknown>
  items: Array<{ quantity: number; unitPriceVnd: number; productAttributes: Record<string, unknown>; bom: unknown }>
}

export interface ICraftFeeFactsStore {
  loadFacts(organizationId: string, orderId: string): Promise<CraftFeeOrderFacts | null>
}

const COMPLEXITY_RANK: Record<CraftComplexity, number> = { EASY: 0, MEDIUM: 1, HARD: 2 }
const isComplexity = (v: unknown): v is CraftComplexity => v === "EASY" || v === "MEDIUM" || v === "HARD"
const positive = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null)

/** Chuyển dữ kiện đơn thành đầu vào tính phí. Giá hàng luôn TRƯỚC VAT và không gồm phí giao. */
export function craftFeeInputFromFacts(facts: CraftFeeOrderFacts, invitedAt: Date): CraftFeeInput {
  const quote = facts.pricingRef
  const itemsList = facts.items.reduce((sum, i) => sum + i.unitPriceVnd * i.quantity, 0)
  const preVat = Math.max(0, facts.totalVnd - facts.vatAmountVnd - (positive(quote.shippingFeeVnd) ?? 0) - (positive(quote.holidaySurchargeVnd) ?? 0))
  const listPriceVnd = positive(quote.subtotalVnd) ?? (itemsList > 0 ? itemsList : preVat)
  const quantity = facts.items.reduce((sum, i) => sum + i.quantity, 0) || (positive(quote.quantity) ?? 1)

  // Phí cố định / nguyên liệu chỉ dùng khi MỌI dòng hàng đều có số — thiếu một dòng thì tạm tính theo %
  const allHave = (pick: (i: CraftFeeOrderFacts["items"][number]) => number | null) => {
    if (facts.items.length === 0) return null
    const values = facts.items.map((i) => pick(i))
    return values.every((v) => v !== null) ? values.reduce((s: number, v, idx) => s + (v as number) * (facts.items[idx]?.quantity ?? 1), 0) : null
  }
  const complexities = facts.items.map((i) => i.productAttributes.craft_complexity).filter(isComplexity)
  const complexity = complexities.sort((a, b) => COMPLEXITY_RANK[b] - COMPLEXITY_RANK[a])[0] ?? null

  const deliverMs = parseDeliveryTimestampMs(
    typeof facts.deliveryWindow.date === "string" ? facts.deliveryWindow.date : null,
    typeof facts.deliveryWindow.timeSlot === "string" ? facts.deliveryWindow.timeSlot : null
  )
  return {
    listPriceVnd,
    discountVnd: Math.min(listPriceVnd, (positive(quote.discountVnd) ?? 0) + (positive(quote.promotionDiscountVnd) ?? 0)),
    productFixedFeeVnd: allHave((i) => positive(i.productAttributes.craft_fee_vnd)),
    materialCostVnd: allHave((i) => bomMaterialCostVnd(i.bom)),
    complexity,
    quantity,
    invitedAt,
    deliverAt: deliverMs === null ? null : new Date(deliverMs),
  }
}

export interface CraftFeeSuggestion {
  feeLabel: string
  suggestedVnd: number
  lines: CraftFeeLine[]
  method: CraftFeePolicy["method"]
  adjustPercent: number
  policy: CraftFeePolicy
}

export async function suggestCraftFee(
  organizationId: string,
  orderId: string,
  store: ICraftFeeFactsStore,
  now = new Date()
): Promise<CraftFeeSuggestion> {
  const facts = await store.loadFacts(organizationId, orderId)
  if (!facts) throw notFound()
  const { spec } = craftFeeSpecOf(facts.settings)
  const policy = parseCraftFeePolicy(facts.settings[CRAFT_FEE_POLICY_KEY], spec)
  const result = computeCraftFee(policy, craftFeeInputFromFacts(facts, now))
  return {
    feeLabel: spec.feeLabel,
    suggestedVnd: result.feeVnd,
    lines: result.lines,
    method: policy.method,
    adjustPercent: policy.coordinatorAdjustPercent,
    policy,
  }
}

/**
 * Phí chốt khi mời chi nhánh: không nhập → phí gợi ý; nhập tay trong biên độ ±% → nhận; vượt biên độ
 * chỉ người có quyền Điều hành (`canApproveOutsideBand`) được chốt, và ghi lại người duyệt.
 */
export function resolveDispatchCraftFee(
  suggestion: CraftFeeSuggestion,
  requestedVnd: number | undefined,
  approver: { canApproveOutsideBand: boolean; actorId: string }
): CraftFeeRecord {
  const finalVnd = requestedVnd ?? suggestion.suggestedVnd
  const outside = !craftFeeOverrideAllowed(suggestion.policy, suggestion.suggestedVnd, finalVnd)
  if (outside && !approver.canApproveOutsideBand) {
    throw unprocessable(
      `${suggestion.feeLabel} vượt quá ±${suggestion.adjustPercent}% so với mức gợi ý ${suggestion.suggestedVnd.toLocaleString("vi-VN")} đ — cần Điều hành duyệt.`
    )
  }
  return {
    suggestedVnd: suggestion.suggestedVnd,
    finalVnd,
    method: suggestion.method,
    lines: suggestion.lines,
    ...(outside ? { overrideApprovedBy: approver.actorId } : {}),
    deductions: [],
    deductionTerms: deductionTermsOf(suggestion.policy), // điều kiện chi nhánh nhận (BL-24)
  }
}
