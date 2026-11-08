import { z } from "zod"

import { data, timestamp } from "./responses-orders"

/**
 * Phản hồi Điều phối ngoài thân đơn: thanh toán, đối tác gia công, nhắc việc, chuỗi gia công qua Thẻ chào, chat nội bộ
 * (OpenAPI nội bộ, PO 07/11/2026). Kiểm bằng phản hồi thật ở `tests/tenant/internal-contract-coordinator.test.ts`.
 */
export const coordinatorPaymentsResponse = z.strictObject({
  payments: z.array(
    z.strictObject({
      id: z.string(),
      status: z.string(),
      kind: z.enum(["DEPOSIT", "BALANCE", "REFUND"]),
      amountVnd: z.number(),
      paymentMethod: z.string().nullable(),
      reference: z.string().nullable(),
      evidenceAssetId: z.string().nullable(),
      collectedBy: z.string(),
      collectedAt: z.string(),
      note: z.string().nullable(),
    })
  ),
})

const partner = z.strictObject({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  phone: z.string(),
  address: z.string().nullable(),
  district: z.string().nullable(),
  province: z.string().nullable(),
  tier: z.string(),
  rating: z.number(),
  capacityDaily: z.number(),
  isActive: z.boolean(),
})
export const partnerResponse = z.strictObject({ partner })
export const partnersResponse = z.strictObject({ partners: z.array(partner) })

/** Liên kết chuỗi ↔ cửa hàng đối tác (`organization_links`). */
const partnership = z.strictObject({
  id: z.string(),
  chainOrgId: z.string(),
  partnerOrgId: z.string(),
  partnerCode: z.string(),
  partnershipType: z.enum(["SUBCONTRACTOR", "FRANCHISE"]),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "TERMINATED"]),
  commissionRate: z.number().optional(),
  capacityDaily: z.number(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  address: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  partnerOrgName: z.string().optional(),
  partnerOrgSlug: z.string().optional(),
  unlockedTools: z.array(z.string()).nullable().optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
})
/** `?active=` → đối tác gia công của Điều phối; không có → liên kết chuỗi (cần `F1`). */
export const chainPartnersResponse = z.union([
  partnersResponse,
  z.strictObject({ success: z.literal(true), data: z.array(partnership), partners: z.array(partnership), total: z.number() }),
])
/** Tạo cửa hàng đối tác mới (mật khẩu tạm trả đúng MỘT lần) hoặc đối tác gia công ngoài (`partner`). */
export const createPartnerResponse = z.union([
  partnerResponse,
  z.strictObject({ success: z.literal(true), data: partnership, temporaryPassword: z.string().optional() }),
])
export const partnershipResponse = z.strictObject({ success: z.literal(true), data: partnership })
export const partnerToolsResponse = z.strictObject({
  success: z.literal(true),
  data: z.strictObject({ partnershipId: z.string(), partnerOrgId: z.string(), unlockedTools: z.array(z.string()) }),
})

export const remindersResponse = z.strictObject({
  reminders: z.array(
    z.strictObject({
      id: z.string(),
      orderId: z.string(),
      orderCode: z.string(),
      milestone: z.enum(["M0", "M1", "M2", "M3", "M4", "M5"]),
      title: z.string(),
      description: z.string(),
      scheduledAt: timestamp,
      isOverdue: z.boolean(),
      overdueMinutes: z.number(),
      urgency: z.enum(["NORMAL", "CRITICAL", "WARNING"]),
      suggestedAction: z.string(),
      messageTemplate: z.string(),
      recipientType: z.enum(["WORKSHOP", "SHIPPER", "CUSTOMER"]),
      recipientTarget: z.string().optional(),
      status: z.enum(["PENDING", "TRIGGERED", "ACKNOWLEDGED", "SNOOZED", "DISMISSED"]),
      acknowledgedAt: timestamp.optional(),
      snoozedUntil: timestamp.optional(),
    })
  ),
  totalActive: z.number(),
  totalOverdue: z.number(),
  totalCritical: z.number(),
})
export const acknowledgeResponse = z.strictObject({ success: z.boolean(), message: z.string() })
const minutes = {
  m0MinutesAfterPaid: z.number(),
  m1MinutesBeforeDelivery: z.number(),
  m2MinutesBeforeDelivery: z.number(),
  m3MinutesAfterShipperAssigned: z.number(),
  m5MinutesAfterDelivery: z.number(),
}
export const reminderPolicyResponse = z.strictObject({ config: z.strictObject(minutes) })
/** `null` khi mẫu chưa có mốc riêng (dùng cấu hình của tiệm). */
export const templateRemindersResponse = z.strictObject({ overrides: z.strictObject(z.object(minutes).partial().shape).nullable() })

// ── Chuỗi gia công (đơn Thẻ chào) ───────────────────────────────────────────────────────────────────────
const actionResult = { success: z.literal(true), message: z.string() }
export const bypassDecisionResponse = data(
  z.strictObject({
    ...actionResult,
    decision: z.enum(["APPROVE", "REJECT"]),
    /** Điểm chất lượng mới của chi nhánh bị trừ khi duyệt bỏ qua. */
    penalty: z.strictObject({ newQualityScore: z.number(), bypassCount: z.number() }).nullable().optional(),
  })
)
export const customerPhotoResponse = data(z.strictObject({ ...actionResult, alreadyApproved: z.boolean() }))
export const qcUploadResponse = data(
  z.strictObject({ ...actionResult, photoUrl: z.string(), productionStatus: z.literal("READY"), cancelledReminders: z.array(z.string()) })
)
const shipperInfo = z.looseObject({ shipperName: z.string(), shipperPhone: z.string() })
export const setShipperResponse = data(
  z.union([
    z.strictObject({ ...actionResult, alreadySubmitted: z.literal(true), shipperInfo }),
    z.strictObject({ ...actionResult, shipperInfo, deliveryStatus: z.literal("DELIVERING"), cancelledReminders: z.array(z.string()) }),
  ])
)
export const confirmDeliveryResponse = data(
  z.union([
    z.strictObject({ ...actionResult, alreadyCompleted: z.literal(true), orderStatus: z.string(), deliveryStatus: z.string() }),
    z.strictObject({
      ...actionResult,
      orderStatus: z.string(),
      deliveryStatus: z.literal("DELIVERED"),
      deliveredAt: z.string(),
      photoUrl: z.string().nullable(),
      cancelledReminders: z.array(z.string()),
    }),
  ])
)
export const craftFeeComplaintResponse = data(z.strictObject({ deducted: z.boolean(), payableVnd: z.number() }))
export const dispatchToChatResponse = z.strictObject({
  success: z.literal(true),
  data: z.strictObject({
    conversationId: z.string(),
    message: z.strictObject({
      id: z.string(),
      conversationId: z.string(),
      senderUserId: z.string(),
      senderRole: z.string(),
      senderName: z.string().optional(),
      messageType: z.enum(["TEXT", "IMAGE", "ACTION_CARD_ORDER", "ACTION_CARD_QC", "SYSTEM_NOTICE"]),
      content: z.string(),
      attachments: z.array(z.string()),
      /** Thẻ đơn gửi cửa hàng đối tác (`ACTION_CARD_ORDER`). */
      actionPayload: z.record(z.string(), z.unknown()),
      isDeleted: z.boolean(),
      createdAt: timestamp,
    }),
  }),
})
