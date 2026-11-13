/**
 * Customer Segment & Customer Interaction Domain Models & Rules.
 * Thuần túy logic nghiệp vụ và Zod schemas, zero ORM / zero Prisma.
 */

import { z } from "zod"
import type { CustomerTier, CustomerConsentItem } from "./customer-master-index"
import {
  deriveCustomerTier,
  deriveCustomerLifecycleStage,
  calculateDaysUntilOccasion,
  hasMarketingConsent,
  type CustomerLifecycleStage,
} from "./crm-rules"

export type CustomerSegmentKind = "DYNAMIC" | "STATIC"
export type CustomerInteractionChannel = "ZALO" | "PHONE" | "SMS" | "EMAIL" | "IN_PERSON" | "OTHER"
export type CustomerInteractionDirection = "OUTBOUND" | "INBOUND"

export const CUSTOMER_INTERACTION_CHANNELS = ["ZALO", "PHONE", "SMS", "EMAIL", "IN_PERSON", "OTHER"] as const
export const CUSTOMER_INTERACTION_DIRECTIONS = ["OUTBOUND", "INBOUND"] as const
export const CUSTOMER_SEGMENT_KINDS = ["DYNAMIC", "STATIC"] as const

/** Zod Schema cho cấu hình bộ lọc phân nhóm khách hàng */
export const customerSegmentRulesSchema = z.object({
  tiers: z.array(z.enum(["NEW", "BRONZE", "SILVER", "GOLD", "VIP"])).optional(),
  minSpentVnd: z.number().nonnegative().optional(),
  maxSpentVnd: z.number().nonnegative().optional(),
  minOrderCount: z.number().int().nonnegative().optional(),
  maxOrderCount: z.number().int().nonnegative().optional(),
  lifecycleStages: z.array(z.enum(["ACQUIRE", "GROW", "RETAIN", "AT_RISK", "DORMANT"])).optional(),
  lastPurchasedWithinDays: z.number().int().positive().optional(),
  notPurchasedForDays: z.number().int().positive().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  occasionUpcomingWithinDays: z.number().int().positive().optional(),
  requiredConsentChannel: z.enum(["ZALO_ZNS", "SMS", "PHONE_CALL", "PROMOTION"]).optional(),
  staticCustomerIds: z.array(z.string().uuid()).optional(),
})

export type CustomerSegmentRules = z.infer<typeof customerSegmentRulesSchema>

export interface CustomerSegment {
  id: string
  organizationId: string
  name: string
  description?: string | null
  kind: CustomerSegmentKind
  rules?: CustomerSegmentRules | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface CustomerInteraction {
  id: string
  organizationId: string
  customerId: string
  channel: CustomerInteractionChannel
  direction: CustomerInteractionDirection
  assetUsageId?: string | null
  summary: string
  outcome?: string | null
  occurredAt: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/** Dữ liệu đầu vào để đánh giá khách hàng có thuộc nhóm hay không */
export interface CustomerEvaluationInput {
  id: string
  tier?: CustomerTier | undefined
  totalSpentVnd: number
  orderCount: number
  lastOrderAt?: Date | string | null | undefined
  tags?: string[] | undefined
  occasions?: Array<{
    name: string
    date: string
  }> | undefined
  consents?: Array<{
    channel: "ZALO_ZNS" | "SMS" | "PHONE_CALL" | "PROMOTION"
    granted: boolean
    revokedAt?: Date | string | null | undefined
  }> | undefined
}

/** Ánh xạ kênh tương tác sang kênh tiếp thị consent */
export function mapInteractionChannelToConsentChannel(
  channel: CustomerInteractionChannel
): "ZALO_ZNS" | "SMS" | "PHONE_CALL" | "PROMOTION" | null {
  switch (channel) {
    case "ZALO":
      return "ZALO_ZNS"
    case "SMS":
      return "SMS"
    case "PHONE":
      return "PHONE_CALL"
    case "EMAIL":
      return "PROMOTION"
    default:
      return null
  }
}

/**
 * Đánh giá một khách hàng có thoả mãn quy tắc của phân nhóm hay không.
 * Tái sử dụng logic RFM và loại bỏ triệt để khách hàng không đồng ý nhận tin.
 */
export function evaluateCustomerForSegment(
  customer: CustomerEvaluationInput,
  rules: CustomerSegmentRules | null | undefined,
  now: Date = new Date()
): boolean {
  if (!rules) return true

  // 1. Nhóm tĩnh: chỉ kiểm tra danh sách ID
  if (rules.staticCustomerIds && rules.staticCustomerIds.length > 0) {
    return rules.staticCustomerIds.includes(customer.id)
  }

  // 2. Chốt chặn bắt buộc: Quyền riêng tư & Tiếp thị (Consent check)
  if (rules.requiredConsentChannel) {
    const consents: CustomerConsentItem[] = (customer.consents ?? []).map((c) => ({
      channel: c.channel,
      granted: c.granted,
      grantedAt: "",
      revokedAt: c.revokedAt ? String(c.revokedAt) : undefined,
    }))

    if (!hasMarketingConsent(consents, rules.requiredConsentChannel)) {
      return false
    }
  }

  // 3. Phân hạng (Tier)
  const effectiveTier = customer.tier ?? deriveCustomerTier(customer.totalSpentVnd, customer.orderCount)
  if (rules.tiers && rules.tiers.length > 0) {
    if (!rules.tiers.includes(effectiveTier)) {
      return false
    }
  }

  // 4. Doanh số mua hàng
  if (rules.minSpentVnd !== undefined && customer.totalSpentVnd < rules.minSpentVnd) {
    return false
  }
  if (rules.maxSpentVnd !== undefined && customer.totalSpentVnd > rules.maxSpentVnd) {
    return false
  }

  // 5. Số lượng đơn
  if (rules.minOrderCount !== undefined && customer.orderCount < rules.minOrderCount) {
    return false
  }
  if (rules.maxOrderCount !== undefined && customer.orderCount > rules.maxOrderCount) {
    return false
  }

  // 6. Giai đoạn vòng đời (Lifecycle stage)
  if (rules.lifecycleStages && rules.lifecycleStages.length > 0) {
    const stage = deriveCustomerLifecycleStage(
      {
        totalSpentVnd: customer.totalSpentVnd,
        orderCount: customer.orderCount,
        tier: customer.tier,
        lastOrderAt: customer.lastOrderAt ? String(customer.lastOrderAt) : undefined,
      },
      now
    )
    if (!rules.lifecycleStages.includes(stage)) {
      return false
    }
  }

  // 7. Mua hàng trong vòng X ngày gần nhất
  if (rules.lastPurchasedWithinDays !== undefined) {
    if (!customer.lastOrderAt) return false
    const lastDate = new Date(customer.lastOrderAt)
    const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0 || diffDays > rules.lastPurchasedWithinDays) {
      return false
    }
  }

  // 8. Đã không mua hàng trong ít nhất Y ngày (nguy cơ rời bỏ / win-back)
  if (rules.notPurchasedForDays !== undefined) {
    if (customer.lastOrderAt) {
      const lastDate = new Date(customer.lastOrderAt)
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < rules.notPurchasedForDays) {
        return false
      }
    }
  }

  // 9. Thẻ phân loại (Tags)
  if (rules.tags && rules.tags.length > 0) {
    const customerTags = new Set(customer.tags ?? [])
    const hasTagMatch = rules.tags.some((tag) => customerTags.has(tag))
    if (!hasTagMatch) return false
  }

  // 10. Dịp kỷ niệm sắp diễn ra
  if (rules.occasionUpcomingWithinDays !== undefined) {
    const occasions = customer.occasions ?? []
    if (occasions.length === 0) return false
    const hasUpcoming = occasions.some((occ) => {
      const days = calculateDaysUntilOccasion(occ.date, now)
      return days !== null && days >= 0 && days <= rules.occasionUpcomingWithinDays!
    })
    if (!hasUpcoming) return false
  }

  return true
}

