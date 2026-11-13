import { randomInt } from "node:crypto"
import { CODE_ALPHABET, generateCodes, validateVoucherBatch } from "@/modules/promotions/domain/voucher-batch"
import { findOrIssueThankYouVoucher } from "@/modules/promotions/infra/thank-you-voucher-repository"
import { readThankYouPolicy, thankYouBatchInput, thankYouEligible, THANK_YOU_CODE_PREFIX } from "../domain/thank-you-voucher"
import { shopPromotionPolicy } from "./active-shop-promotions"

export interface ThankYouVoucherView {
  code: string
  percent: number
  expiresAt: string | null
  used: boolean
}

const cryptoRandom = () => randomInt(CODE_ALPHABET.length) / CODE_ALPHABET.length

/**
 * Mã cảm ơn cho người đặt đã xác minh khi đơn hoàn tất (ALG 5.15). Phát lần đầu khách mở màn cảm ơn,
 * các lần sau trả lại đúng mã đó. Mã gắn khách đặt đơn: khách khác nhập sẽ bị từ chối ở bước báo giá.
 */
export async function thankYouVoucherFor(
  order: {
    code: string; organization_id: string; status: string; delivery_status: string; customer_id: string | null; created_by: string
    organization?: { settings?: unknown } | null
  },
  loadPolicy = shopPromotionPolicy,
  now = new Date(),
): Promise<ThankYouVoucherView | null> {
  const policy = readThankYouPolicy(order.organization?.settings)
  if (!thankYouEligible({ status: order.status, deliveryStatus: order.delivery_status, customerId: order.customer_id }, policy)) return null
  const { maxDiscountPercent } = await loadPolicy(order.organization_id)
  const batch = thankYouBatchInput(order.code, policy, maxDiscountPercent, now)
  if (Object.keys(validateVoucherBatch(batch, { maxDiscountPercent, activePromotionIds: new Set() })).length > 0) return null
  const issued = await findOrIssueThankYouVoucher({
    organizationId: order.organization_id,
    customerId: order.customer_id as string,
    createdBy: order.created_by,
    batch,
    makeCode: (taken) => generateCodes(THANK_YOU_CODE_PREFIX, 1, taken, cryptoRandom)[0] ?? null,
  })
  return issued ? { ...issued, expiresAt: issued.expiresAt?.toISOString() ?? null } : null
}
