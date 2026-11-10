import { z } from "zod"

import {
  CUSTOMER_INTERACTION_CHANNELS,
  CUSTOMER_INTERACTION_DIRECTIONS,
  CUSTOMER_SEGMENT_KINDS,
} from "@/modules/crm/domain/customer-segment"
import { STAFF_LEAD_REASONS } from "@/modules/acquisition/use-cases/create-staff-lead"
import { CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUSES } from "@/modules/marketing-center/domain/campaign"
import { OCCASION_REGISTERS } from "@/modules/organization/domain/occasion-rules"

/**
 * Lược đồ yêu cầu của khách hàng & marketing: `/api/v1/leads/*`, `/api/v1/campaigns/*`, `/api/v1/customer-segments/*`,
 * `/api/v1/customers/*`, `/api/v1/customer-interactions`, `/api/v1/marketing-center/*`, `/api/v1/occasions/*`,
 * `/api/v1/delivery/*` — OpenAPI nội bộ, PO 07/11/2026. Lược đồ từng khai trong 7 route được chuyển NGUYÊN VĂN về đây và
 * route import lại; phân khúc và tương tác khách dùng lược đồ đầu vào của use-case `crm` (xuất lại). Thân thêm khách
 * tiềm năng do route tự đọc — chỉ mô tả. Query chỉ để mô tả.
 */
export { createCustomerSegmentInputSchema } from "@/modules/crm/use-cases/create-customer-segment.use-case"
export { updateCustomerSegmentInputSchema } from "@/modules/crm/use-cases/update-customer-segment.use-case"
export { recordCustomerInteractionInputSchema } from "@/modules/crm/use-cases/record-customer-interaction.use-case"

// campaigns/route.ts
export const createCampaignSchema = z.object({
  name: z.string().min(1, "Tên chiến dịch không được để trống").max(150),
  objective: z.enum(CAMPAIGN_OBJECTIVES),
  occasion_code: z.string().nullable().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
})

// campaigns/[id]/route.ts
export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  objective: z.enum(["AWARENESS", "LEAD", "SALE", "RETENTION"]).optional(),
  occasion_code: z.string().nullable().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
})

// delivery/my-runs/[id]/route.ts
export const shipperRunEventBody = z.object({
  event: z.enum(["PICKED_UP", "ON_THE_WAY", "DELIVERED_SUCCESS", "DELIVERY_FAILED"]),
  podAssetId: z.string().uuid().optional(),
  recipientSignedName: z.string().max(200).optional(),
  failureReason: z.string().max(500).optional(),
})

// leads/[id]/route.ts
export const updateLeadBody = z.object({
  status: z.string().max(20).optional(),
  assigneeUserId: z.string().max(64).nullable().optional(),
})

// occasions/route.ts
export const createOccasionBody = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  register: z.enum(OCCASION_REGISTERS).optional(),
  sortOrder: z.number().int().optional(),
})

// occasions/[id]/route.ts
export const updateOccasionBody = z.object({
  name: z.string().min(1).optional(),
  register: z.enum(OCCASION_REGISTERS).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

// ── Chỉ mô tả — route tự đọc ────────────────────────────────────────────────
/** `leads` POST: route đọc từng trường chuỗi; use-case kiểm tên, số điện thoại và lý do (`WALK_IN` · `QUOTE_REQUEST` · `CONTACT`). */
export const createLeadBody = z.object({
  name: z.string(),
  phone: z.string(),
  reason: z.enum(STAFF_LEAD_REASONS),
  message: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
})

const int = z.string().regex(/^-?\d+$/)
const page = { limit: int.optional(), offset: int.optional() }
export const leadsQuery = z.object({ status: z.string().optional(), limit: int.optional(), cursor: z.string().optional() })
export const campaignsQuery = z.object({ status: z.enum(CAMPAIGN_STATUSES).optional(), objective: z.enum(CAMPAIGN_OBJECTIVES).optional(), limit: int.optional(), cursor: z.string().optional() })
export const segmentsQuery = z.object({ kind: z.enum(CUSTOMER_SEGMENT_KINDS).optional(), search: z.string().optional(), ...page })
export const segmentCustomersQuery = z.object({ search: z.string().optional(), ...page })
export const interactionsQuery = z.object({
  customer_id: z.string().optional(),
  channel: z.enum(CUSTOMER_INTERACTION_CHANNELS).optional(),
  direction: z.enum(CUSTOMER_INTERACTION_DIRECTIONS).optional(),
  ...page,
})
export const customerInteractionsQuery = interactionsQuery.omit({ customer_id: true })
export const kpisQuery = z.object({ time_window: z.enum(["7D", "30D", "90D", "ALL"]).optional() })
