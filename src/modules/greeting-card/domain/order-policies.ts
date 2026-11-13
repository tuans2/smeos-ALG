/**
 * Ưu đãi & Thỏa thuận áp vào một đơn Thẻ chào lúc khách đặt (Spec #2, #5). Pure TypeScript.
 * - Mỗi đơn nhận TỐI ĐA 01 ưu đãi, và chỉ ưu đãi bộ sưu tập đang áp dụng.
 *   Có từ 2 ưu đãi trở lên và cho khách chọn → khách BẮT BUỘC tự chọn, không chọn sẵn (PO 08/10/2026).
 *   Tiệm không cho khách chọn (hoặc chỉ 1 ưu đãi) → luôn là ưu đãi đầu tiên, bỏ qua lựa chọn client gửi.
 * - Bộ sưu tập có thỏa thuận → khách phải xác nhận đã đọc trước khi đặt.
 * Máy chủ chụp lại đúng ưu đãi + các thỏa thuận khách đã đồng ý để lưu cùng đơn.
 */
import type { PublicAppliedPolicies } from "./store-policy"
import type { PromotionPricing } from "./promotion-pricing"

export interface OrderPolicySnapshot {
  /** `kind`/`percent` lưu kèm để báo giá sau (mẫu chưa niêm yết giá) vẫn trừ đúng ưu đãi khách đã chọn. */
  promotion: ({ id: string; title: string; customerText: string } & PromotionPricing) | null
  agreements: Array<{ id: string; title: string }>
  termsConfirmed: boolean
}

export type OrderPolicyResult =
  | { ok: true; snapshot: OrderPolicySnapshot }
  | { ok: false; field: "selectedPromotionId" | "confirmedTerms"; message: string }

export function resolveOrderPolicies(
  applied: PublicAppliedPolicies,
  input: { selectedPromotionId?: string | undefined; confirmedTerms?: boolean | undefined },
): OrderPolicyResult {
  const chosen = selectPromotion(applied, input.selectedPromotionId, { required: true })
  if (!chosen.ok) return { ok: false, field: "selectedPromotionId", message: chosen.message }
  const promotion = chosen.promotion

  const needsConfirm = applied.agreements.length > 0
  if (needsConfirm && input.confirmedTerms !== true) {
    return { ok: false, field: "confirmedTerms", message: "Vui lòng xác nhận đã đọc các thỏa thuận trước khi đặt hoa." }
  }

  return {
    ok: true,
    snapshot: {
      promotion: promotion
        ? { id: promotion.id, title: promotion.title, customerText: promotion.customerText, kind: promotion.kind, percent: promotion.percent }
        : null,
      agreements: applied.agreements.map((a) => ({ id: a.id, title: a.title })),
      termsConfirmed: needsConfirm,
    },
  }
}

type AppliedPromotion = PublicAppliedPolicies["promotions"][number]

export const PROMOTION_CHOICE_MISSING = "Vui lòng chọn 01 ưu đãi cho đơn hoa."

/** Khách phải tự chọn ưu đãi: tiệm cho khách chọn và có từ 2 ưu đãi đang áp dụng trở lên. */
export function customerChoosesPromotion(applied: Pick<PublicAppliedPolicies, "promotions" | "allowCustomerPromotionChoice">): boolean {
  return applied.allowCustomerPromotionChoice && applied.promotions.length > 1
}

/**
 * Ưu đãi áp cho đơn: tối đa 01, chỉ ưu đãi bộ sưu tập đang áp dụng. Khách không được chọn →
 * luôn là ưu đãi đầu tiên (bỏ qua lựa chọn client gửi). Khách được chọn mà chưa chọn: báo giá tính
 * không ưu đãi; tạo đơn (`required`) báo lỗi. Dùng chung cho báo giá và tạo đơn.
 */
export function selectPromotion(
  applied: PublicAppliedPolicies,
  selectedPromotionId: string | undefined,
  options: { required?: boolean } = {},
): { ok: true; promotion: AppliedPromotion | null } | { ok: false; message: string } {
  if (applied.promotions.length === 0) return { ok: true, promotion: null }
  if (!customerChoosesPromotion(applied)) return { ok: true, promotion: applied.promotions[0] ?? null }
  const chosenId = selectedPromotionId
  if (!chosenId) return options.required ? { ok: false, message: PROMOTION_CHOICE_MISSING } : { ok: true, promotion: null }
  const found = applied.promotions.find((p) => p.id === chosenId)
  return found ? { ok: true, promotion: found } : { ok: false, message: "Ưu đãi đã chọn không còn áp dụng. Vui lòng chọn lại." }
}

/** Dòng ghi chú cho xưởng/Điều phối thấy ngay ưu đãi phải tặng kèm. */
export function promotionNote(snapshot: OrderPolicySnapshot): string {
  return snapshot.promotion ? `[Ưu đãi: ${snapshot.promotion.title}]` : ""
}
