import { z } from "zod"

import { data, timestamp } from "./responses-orders"
import { DECISION_STATUS, dismissal, ORDER_STATUS, ROLE, STEP_ID } from "./responses-greeting-shared"

/**
 * Phản hồi Thẻ chào ngoài đơn hàng: bộ sưu tập, link gửi khách, cài đặt hiển thị, thống kê, tin nhắn nội bộ, tích hợp,
 * yêu cầu huỷ/đổi/giảm giá, chi nhánh chuỗi, theo dõi (OpenAPI nội bộ, PO 07/11/2026). Sinh từ kiểu TS của use-case
 * rồi kiểm bằng phản hồi thật ở `tests/tenant/internal-contract-greeting-*.test.ts`.
 */
const catalogColumns = {
  id: z.string(),
  organization_id: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().nullable(),
  filters: z.unknown(),
  is_active: z.boolean(),
  created_by: z.string(),
  created_at: timestamp,
  trashed_at: timestamp.nullable(),
  purge_after: timestamp.nullable(),
  updated_at: timestamp,
}
const catalogItem = {
  id: z.string(),
  organization_id: z.string(),
  created_at: timestamp,
  updated_at: timestamp,
  product_id: z.string(),
  catalog_id: z.string(),
  sort_order: z.number(),
}
export const catalogsResponse = z.strictObject({
  data: z.array(
    z.strictObject({
      ...catalogColumns,
      organization: z.strictObject({ id: z.string(), name: z.string(), slug: z.string() }),
      _count: z.strictObject({ items: z.number(), sessions: z.number() }),
    })
  ),
  next_cursor: z.string().nullable(),
})
export const catalogCreatedResponse = data(z.strictObject(catalogColumns))
/** Bộ sưu tập kèm mẫu: dòng `products` (khoá snake_case) + ảnh chính, biến thể, ảnh, phân tích, tồn kho. */
export const catalogResponse = data(
  z.strictObject({
    ...catalogColumns,
    _count: z.strictObject({ sessions: z.number() }),
    items: z.array(
      z.strictObject({
        ...catalogItem,
        product: z.looseObject({ id: z.string(), code: z.string(), name: z.string(), masterImageUrl: z.string().optional(), driveLink: z.string().optional() }),
      })
    ),
  })
)
export const catalogItemResponse = data(z.strictObject(catalogItem))
export const successResponse = z.strictObject({ success: z.boolean() })
export const catalogHeartsResponse = data(
  z.strictObject({
    catalogId: z.string(),
    totalHearts: z.number(),
    rows: z.array(
      z.strictObject({
        code: z.string(),
        name: z.string(),
        imageUrl: z.string().nullable(),
        productId: z.string(),
        hearts: z.number(),
        privateHearts: z.number(),
        publicHearts: z.number(),
      })
    ),
  })
)

export const sendLinkCreatedResponse = data(
  z.strictObject({ sessionId: z.string(), sendCode: z.string(), catalogId: z.string(), shareUrl: z.string(), expiresAt: z.string().nullable() })
)
export const sendLinksResponse = z.strictObject({
  data: z.array(
    z.strictObject({
      id: z.string(),
      created_at: timestamp,
      status: z.string(),
      link_state: z.enum(["ACTIVE", "EXPIRED", "REVOKED"]),
      order: z.strictObject({ total_vnd: z.number(), paid_vnd: z.number(), id: z.string(), code: z.string(), status: ORDER_STATUS }).nullable(),
      catalog: z.strictObject({ id: z.string(), code: z.string(), name: z.string() }),
      order_id: z.string().nullable(),
      send_code: z.string(),
      sale_id: z.string(),
      customer_name: z.string().nullable(),
      customer_phone: z.string().nullable(),
      expires_at: timestamp.nullable(),
      revoked_at: timestamp.nullable(),
      last_active_at: timestamp,
    })
  ),
  next_cursor: z.string().nullable(),
})
export const revokedResponse = data(z.strictObject({ revoked: z.boolean() }))
export const copiedResponse = data(z.strictObject({ copied: z.boolean() }))
export const linkCustomerResponse = data(z.strictObject({ customerName: z.string(), customerPhone: z.string().nullable() }))
export const shareLinksResponse = data(
  z.array(
    z.strictObject({
      code: z.string(),
      path: z.string(),
      catalogName: z.string(),
      ownerName: z.string(),
      channel: z.string().nullable(),
      copiedAt: z.string(),
      revoked: z.boolean(),
      opens: z.number(),
      orders: z.number(),
    })
  )
)
export const shareLinkCreatedResponse = data(z.strictObject({ code: z.string(), path: z.string(), createdAt: z.string() }))

export const displaySettingsResponse = data(
  z.strictObject({
    required: z.array(z.string()),
    fields: z.array(z.strictObject({ key: z.string(), label: z.string() })),
    settings: z.record(z.string(), z.array(z.enum(["description", "category", "flowers", "color", "style", "dimensions", "wrapStyle"]))),
    pricing: z.strictObject({ hidePrice: z.boolean(), showDiscounts: z.boolean() }),
    thankYou: z.strictObject({ enabled: z.boolean(), percent: z.number(), validDays: z.number() }),
  })
)
const funnel = {
  saleName: z.string(),
  openRate: z.number(),
  orderRate: z.number(),
  paidRate: z.number(),
  saleId: z.string(),
  sent: z.number(),
  opened: z.number(),
  selected: z.number(),
  ordered: z.number(),
  paid: z.number(),
  revenueVnd: z.number(),
}
export const salesFunnelResponse = data(z.strictObject({ rows: z.array(z.strictObject(funnel)), total: z.strictObject(funnel), days: z.number() }))
export const channelFunnelResponse = data(
  z.strictObject({
    days: z.number(),
    rows: z.array(
      z.strictObject({ channel: z.string(), label: z.string(), views: z.number(), details: z.number(), formOpens: z.number(), orders: z.number(), orderRate: z.number() })
    ),
  })
)

// ── Tin nhắn nội bộ ──────────────────────────────────────────────────────────────────────────────────────
export const threadResponse = data(
  z.strictObject({
    maxDiscountPercent: z.number(),
    canDecideDiscount: z.boolean(),
    canDecideCancellation: z.boolean(),
    label: z.string(),
    ownerSaleName: z.string().nullable(),
    messages: z.array(
      z.strictObject({
        id: z.string(),
        stepKey: z.string(),
        stepTitle: z.string(),
        senderName: z.string(),
        senderRoleLabel: z.string(),
        toLabel: z.string().nullable(),
        body: z.string(),
        createdAt: z.string(),
        mine: z.boolean(),
        unread: z.boolean(),
        kind: z.enum(["DISCOUNT_REQUEST", "CANCELLATION_REQUEST", "MESSAGE", "DISCOUNT_DECISION", "CANCELLATION_DECISION"]),
        discount: z
          .strictObject({
            status: z.string(),
            label: z.string(),
            approvedVnd: z.number().nullable(),
            requestId: z.string(),
            baseTotalVnd: z.number(),
            requestedVnd: z.number(),
            percent: z.number().nullable(),
          })
          .nullable(),
        cancellation: z
          .strictObject({
            requestId: z.string(),
            type: z.string(),
            status: z.string(),
            refundAmountVnd: z.number(),
            actualRefundVnd: z.number().nullable(),
            reason: z.string(),
            note: z.string().optional(),
          })
          .nullable(),
      })
    ),
  })
)
export const messageSentResponse = data(z.strictObject({ id: z.string(), createdAt: z.string() }))
export const messagesReadResponse = data(z.strictObject({ marked: z.number() }))
export const recipientsResponse = data(
  z.strictObject({
    roles: z.array(z.strictObject({ role: ROLE, label: z.string() })),
    members: z.array(z.strictObject({ userId: z.string(), name: z.string() })),
  })
)

// ── Yêu cầu huỷ / đổi / giảm giá ────────────────────────────────────────────────────────────────────────
const CANCEL_TYPE = z.enum(["CANCEL_ONLY", "FULL_REFUND", "PARTIAL_REFUND"])
export const cancellationProposalResponse = data(
  z.strictObject({
    id: z.string(),
    payload: z.strictObject({
      status: DECISION_STATUS,
      orderId: z.string(),
      orderCode: z.string(),
      totalVnd: z.number(),
      paidVnd: z.number(),
      proposedBy: z.string(),
      proposedAt: z.string(),
      decidedBy: z.string().optional(),
      decidedAt: z.string().optional(),
      decidedNote: z.string().optional(),
      actualRefundVnd: z.number().optional(),
      autoApproved: z.boolean().optional(),
      followUp: z
        .strictObject({
          status: z.enum(["PENDING", "DONE"]),
          refundDueVnd: z.number(),
          doneBy: z.string().optional(),
          doneAt: z.string().optional(),
          note: z.string().optional(),
        })
        .optional(),
      type: CANCEL_TYPE,
      reason: z.string(),
      refundAmountVnd: z.number(),
      note: z.string().optional(),
    }),
  })
)
export const cancellationsResponse = data(
  z.array(
    z.strictObject({
      id: z.string(),
      created_at: timestamp,
      order_id: z.string().nullable(),
      sender_id: z.string(),
      body: z.string(),
      payload: z.unknown(),
      delivery_status: z.string().nullable(),
    })
  )
)
export const cancellationDecisionResponse = data(
  z.strictObject({ orderId: z.string(), orderCode: z.string(), status: DECISION_STATUS, orderStatus: ORDER_STATUS, refundVnd: z.number() })
)
export const cancellationFollowUpResponse = data(z.strictObject({ orderId: z.string(), refundVnd: z.number() }))
export const changeDecisionResponse = data(
  z.strictObject({ orderId: z.string(), orderCode: z.string(), status: DECISION_STATUS, totalVnd: z.number(), feeDeltaVnd: z.number() })
)
export const discountDecisionResponse = data(z.strictObject({ orderId: z.string(), orderCode: z.string(), status: DECISION_STATUS, totalVnd: z.number() }))

// ── Theo dõi: bỏ / khôi phục, dòng thời gian ────────────────────────────────────────────────────────────
export const dismissProposalResponse = data(z.strictObject({ directApproved: z.boolean(), dismissal }))
export const dismissDecisionResponse = data(z.strictObject({ status: z.enum(["APPROVED", "REJECTED"]) }))
export const restoredResponse = data(z.strictObject({ restored: z.literal(true) }))
export const timelineResponse = z.strictObject({
  orderId: z.string().nullable(),
  sessionId: z.string().nullable(),
  segments: z.array(
    z.strictObject({
      stepId: STEP_ID,
      title: z.string(),
      enteredAt: z.string(),
      leftAt: z.string().nullable(),
      durationMinutes: z.number(),
      slaMinutes: z.number().nullable(),
      overMinutes: z.number(),
    })
  ),
  data: z.array(
    z.strictObject({
      at: z.string(),
      kind: z.string(),
      label: z.string(),
      entersStep: STEP_ID.nullable(),
      actorId: z.string().nullable(),
      note: z.string().nullable(),
      imageUrls: z.array(z.string()).optional(),
    })
  ),
  next_cursor: z.string().nullable(),
  total: z.number(),
  allImageUrls: z.strictObject({
    productPhotoUrls: z.array(z.string()),
    recipientPhotoUrls: z.array(z.string()),
    paymentProofUrl: z.string().nullable(),
    paymentProofBalanceUrl: z.string().nullable(),
  }),
})
