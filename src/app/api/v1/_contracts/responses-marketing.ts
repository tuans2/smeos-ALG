import { z } from "zod"
import { actionDone } from "./responses-actions"

import { LEAD_STATUSES } from "@/modules/acquisition/domain/lead-rules"
import {
  CUSTOMER_INTERACTION_CHANNELS,
  CUSTOMER_INTERACTION_DIRECTIONS,
  CUSTOMER_SEGMENT_KINDS,
  customerSegmentRulesSchema,
} from "@/modules/crm/domain/customer-segment"
import { CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUSES } from "@/modules/marketing-center/domain/campaign"
import { OCCASION_REGISTERS } from "@/modules/organization/domain/occasion-rules"

import { assetUsage } from "./responses-storage"

/**
 * Phản hồi khách hàng & marketing (OpenAPI nội bộ, PO 07/11/2026): `leads`, `campaigns`, `marketing-center`,
 * `customer-segments`, `customers/{id}/interactions`, `customer-interactions`, `occasions`, `delivery`. Sinh từ kiểu TS của
 * `acquisition` (dòng `leads` chọn cột), `marketing-center`, `crm`, `organization` (dòng `occasions`), `coordinator`
 * (shipper), đối chiếu mẫu ghi từ phản hồi thật rồi kiểm ở `tests/tenant/internal-contract-marketing.test.ts`.
 */
const timestamp = z.iso.datetime()
const data = <T extends z.ZodType>(schema: T) => z.strictObject({ data: schema })
const counts = z.record(z.string(), z.number())
const offsetPage = { total: z.number(), limit: z.number(), offset: z.number() }

/** Dòng `leads` (cột chọn sẵn, snake_case). `phone` là chữ rõ đã giải mã. */
const lead = z.strictObject({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  message: z.string().nullable(),
  source: z.enum(["CATALOG_LINK", "SHORT_LINK", "LANDING", "CHAT", "MANUAL"]),
  source_ref: z.string().nullable(),
  utm_source: z.string().nullable(),
  utm_medium: z.string().nullable(),
  utm_campaign: z.string().nullable(),
  status: z.enum(LEAD_STATUSES),
  assignee_user_id: z.string().nullable(),
  customer_id: z.string().nullable(),
  consent_at: timestamp.nullable(),
  created_at: timestamp,
  status_changed_at: timestamp.nullable(),
  short_link: z.strictObject({ name: z.string(), placement_label: z.string().nullable() }).nullable(),
})
/** Không bọc `{ data }`. `counts`: trạng thái → số khách (mọi trạng thái, không theo bộ lọc). */
export const leadsResponse = z.strictObject({ items: z.array(lead), nextCursor: z.string().nullable(), counts })
export const leadResponse = lead
export const leadCreatedResponse = z.strictObject({ lead: z.strictObject({ id: z.string() }) })

const campaign = z.strictObject({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  objective: z.enum(CAMPAIGN_OBJECTIVES),
  occasionCode: z.string().nullable(),
  startsAt: timestamp.nullable(),
  endsAt: timestamp.nullable(),
  status: z.enum(CAMPAIGN_STATUSES),
  createdBy: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
})
export const campaignsResponse = z.strictObject({ data: z.array(campaign), counts, next_cursor: z.string().nullable() })
export const campaignResponse = data(campaign)
export const campaignDetailResponse = data(
  z.strictObject({
    campaign,
    stats: z.strictObject({ totalUsages: z.number(), totalScans: z.number(), totalLeads: z.number(), convertedOrders: z.number() }),
    /** Tối đa 100 lần dùng tài sản gắn chiến dịch. */
    usages: z.array(assetUsage),
  })
)

const MODULE = z.enum(["brand", "content", "promotion", "sales", "care", "print"])
const strip = z.strictObject({
  module: MODULE,
  hasData: z.boolean(),
  items: z.array(
    z.strictObject({ key: z.string(), module: MODULE, label: z.string(), description: z.string(), value: z.number(), unit: z.string(), formattedValue: z.string() })
  ),
})
export const kpisResponse = data(z.strictObject({ brand: strip, content: strip, promotion: strip, sales: strip, care: strip, print: strip }))

const segment = z.strictObject({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  kind: z.enum(CUSTOMER_SEGMENT_KINDS),
  rules: customerSegmentRulesSchema.strict().nullable().optional(),
  createdBy: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
})
export const segmentsResponse = z.strictObject({ data: z.array(segment), ...offsetPage })
export const segmentResponse = data(segment)
export const segmentDeletedResponse = actionDone("deleted")

/** Hồ sơ khách tổng hợp (`CustomerMasterIndex`); số điện thoại, email, địa chỉ là chữ rõ đã giải mã. */
const customer = z.strictObject({
  id: z.string(),
  organizationId: z.string(),
  code: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()),
  metrics: z.strictObject({
    tier: z.enum(["NEW", "BRONZE", "SILVER", "GOLD", "VIP"]),
    totalSpentVnd: z.number(),
    orderCount: z.number(),
    lastOrderAt: z.string().optional(),
    aovVnd: z.number(),
  }),
  preferences: z.strictObject({ preferredFlowers: z.array(z.string()), preferredColors: z.array(z.string()) }),
  occasions: z.array(
    z.strictObject({
      id: z.string(),
      name: z.string(),
      date: z.string(),
      isRecurring: z.boolean(),
      reminderDaysBefore: z.number(),
      recipientName: z.string().optional(),
      notes: z.string().optional(),
    })
  ),
  consents: z.array(
    z.strictObject({ channel: z.enum(["ZALO_ZNS", "SMS", "PHONE_CALL", "PROMOTION"]), granted: z.boolean(), grantedAt: z.string(), revokedAt: z.string().optional() })
  ),
  availableVouchers: z.array(
    z.strictObject({
      code: z.string(),
      discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
      discountValue: z.number(),
      expiresAt: z.string().optional(),
      minOrderVnd: z.number(),
      maxDiscountVnd: z.number().optional(),
    })
  ),
  updatedAt: z.string(),
})
export const customersPageResponse = z.strictObject({ data: z.array(customer), next_cursor: z.string().nullable() })
export const segmentCustomersResponse = z.strictObject({
  data: z.array(customer),
  segment_name: z.string(),
  total_matched: z.number(),
  limit: z.number(),
  offset: z.number(),
})

const interaction = z.strictObject({
  id: z.string(),
  organizationId: z.string(),
  customerId: z.string(),
  channel: z.enum(CUSTOMER_INTERACTION_CHANNELS),
  direction: z.enum(CUSTOMER_INTERACTION_DIRECTIONS),
  assetUsageId: z.string().nullable().optional(),
  summary: z.string(),
  outcome: z.string().nullable().optional(),
  occurredAt: timestamp,
  createdBy: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
})
export const interactionsResponse = z.strictObject({ data: z.array(interaction), ...offsetPage })
export const interactionResponse = data(interaction)

/** Dòng `occasions` nguyên bản (snake_case). Danh mục mặc định được gieo khi đọc lần đầu. */
const occasion = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  code: z.string(),
  name: z.string(),
  sort_order: z.number(),
  is_active: z.boolean(),
  register: z.enum(OCCASION_REGISTERS),
  created_at: timestamp,
  updated_at: timestamp,
})
export const occasionsResponse = z.strictObject({ data: z.array(occasion), next_cursor: z.null() })
/** Envelope riêng `{ occasion }`, không phải `{ data }`. */
export const occasionResponse = z.strictObject({ occasion })

/** Không bọc `{ data }`. Không có giá, ghi chú nội bộ hay người đặt. */
export const shipperRunsResponse = z.strictObject({
  phoneMissing: z.boolean(),
  runs: z.array(
    z.strictObject({
      orderId: z.string(),
      code: z.string(),
      recipientName: z.string(),
      recipientPhone: z.string(),
      deliveryAddress: z.unknown(),
      deliveryTimeSlot: z.string().nullable(),
      deliveryTargetAt: z.string().nullable(),
      cardMessage: z.string().nullable(),
      deliveryState: z.string().nullable(),
    })
  ),
})
export const shipperRunReportResponse = z.strictObject({ deliveryState: z.string().nullable() })
