/**
 * Chiết khấu theo hạng khách và phụ phí giờ cao điểm cho báo giá Thẻ Chào (checklist ALG 3.1). Đọc quy tắc
 * giá phạm vi tổ chức (`pricing_rules`, mới nhất đang hiệu lực) và hạng của khách theo SĐT người đặt.
 */

import {
  CUSTOMER_TIER_LABEL, isCustomerTier, parsePeakHours, parseTierDiscount, peakHourSurchargeFor,
} from "@/modules/products/domain/customer-tier-pricing"
import { normalizePhone } from "../domain/greeting-card-rules"
import { TierPeakFactsRepository } from "../infra/tier-peak-facts-repository"

export async function tierAndPeakFor(
  organizationId: string,
  customerPhone: string | undefined,
  timeSlot: string | undefined,
  facts: Pick<TierPeakFactsRepository, "latestRules" | "customerTierByPhone"> = new TierPeakFactsRepository(),
) {
  const rules = await facts.latestRules(organizationId)
  const discounts = parseTierDiscount(rules.tierDiscount)
  const peak = peakHourSurchargeFor(parsePeakHours(rules.peakHours), timeSlot)
  const anyDiscount = Object.values(discounts).some((r) => r > 0)
  const rawTier = anyDiscount && customerPhone ? await facts.customerTierByPhone(organizationId, normalizePhone(customerPhone)) : null
  const tier = isCustomerTier(rawTier) ? rawTier : null
  const ratio = tier ? discounts[tier] : 0
  return {
    tierDiscount: tier && ratio > 0 ? { ratio, label: `Ưu đãi khách hạng ${CUSTOMER_TIER_LABEL[tier]}` } : null,
    peakHour: peak ? { vnd: peak.vnd, label: peak.label } : null,
  }
}
