import { z } from "zod"

/**
 * Phản hồi đơn hàng `/api/v1/orders/*` và báo giá `/api/v1/quotations/*` (OpenAPI nội bộ, PO 07/11/2026). Sinh từ
 * kiểu TS của use-case (`src/modules/orders`, `src/modules/sales`) rồi kiểm bằng phản hồi thật ở
 * `tests/tenant/internal-contract-orders.test.ts`. Khoá giữ nguyên như mã trả.
 */
export const timestamp = z.iso.datetime()
export const data = <T extends z.ZodType>(schema: T) => z.strictObject({ data: schema })
const items = <T extends z.ZodType>(schema: T) => z.strictObject({ items: z.array(schema) })

const ORDER_STATUS = z.enum(["DRAFT", "CONFIRMED", "PROCESSING", "DELIVERED", "COMPLETED", "CANCELLED"])
const PRODUCTION_STATUS = z.enum(["WAITING", "ASSIGNED", "ARRANGING", "QUALITY_CHECK", "READY"])
const DELIVERY_STATUS = z.enum(["PENDING", "DISPATCHED", "DELIVERING", "DELIVERED", "FAILED"])
const SOURCE_CODE = z.enum(["BROCHURE", "CATALOG", "LANDING", "SHORT_LINK", "CHAT", "MANUAL", "CHANNEL", "NETWORK", "QUOTATION"])

const deliveryWindow = z.strictObject({ date: z.string(), timeSlot: z.string().optional() })
const orderEvent = z.strictObject({
  id: z.string(),
  organizationId: z.string(),
  orderId: z.string(),
  axis: z.enum(["order", "production", "delivery"]),
  fromValue: z.string().nullable().optional(),
  toValue: z.string(),
  actorId: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  createdAt: timestamp,
})
export const order = z.strictObject({
  id: z.string(),
  organizationId: z.string(),
  branchId: z.string().nullable().optional(),
  code: z.string(),
  customerId: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  status: ORDER_STATUS,
  productionStatus: PRODUCTION_STATUS,
  deliveryStatus: DELIVERY_STATUS,
  totalVnd: z.number(),
  pricingRuleRef: z.record(z.string(), z.unknown()).nullable().optional(),
  voucherId: z.string().nullable().optional(),
  cardMessage: z.string().nullable().optional(),
  internalNote: z.string().nullable().optional(),
  deliveryWindow: deliveryWindow.nullable().optional(),
  deliveryAddress: z
    .strictObject({
      recipientName: z.string(),
      phone: z.string(),
      street: z.string(),
      ward: z.string().optional(),
      district: z.string().optional(),
      province: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      notes: z.string().optional(),
    })
    .nullable()
    .optional(),
  createdBy: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
  items: z
    .array(
      z.strictObject({
        id: z.string(),
        organizationId: z.string(),
        orderId: z.string(),
        productId: z.string().nullable().optional(),
        variantId: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        quantity: z.number(),
        unitPriceVnd: z.number(),
        metadata: z.record(z.string(), z.unknown()).nullable().optional(),
      })
    )
    .optional(),
  assignments: z
    .array(
      z.strictObject({
        id: z.string(),
        organizationId: z.string(),
        orderId: z.string(),
        assigneeId: z.string(),
        assignedBy: z.string(),
        difficulty: z.string().optional(),
        assignedAt: timestamp,
        releasedAt: timestamp.nullable().optional(),
      })
    )
    .optional(),
  events: z.array(orderEvent).optional(),
})
export const orderResponse = z.strictObject({ order })
/** Chuẩn v1.1 (audit API-10): `total` đếm cả danh sách đang lọc, không theo con trỏ. */
export const ordersResponse = z.strictObject({ data: z.array(order), next_cursor: z.string().nullable(), meta: z.strictObject({ total: z.number() }) })
const sla = z.strictObject({
  totalDurationMinutes: z.number(),
  productionDurationMinutes: z.number().optional(),
  deliveryDurationMinutes: z.number().optional(),
  isSlaMet: z.boolean(),
  slaTargetMinutes: z.number(),
})
export const orderDetailResponse = z.strictObject({ order, sla })
export const orderEventsResponse = z.strictObject({ events: z.array(orderEvent), sla })

const floristItem = z.strictObject({
  description: z.string().nullable(),
  quantity: z.number(),
  variantName: z.string().nullable(),
  stemCount: z.number().nullable(),
  recipe: z.array(
    z.strictObject({ flowerName: z.string(), quantity: z.number(), unit: z.string().nullable(), color: z.string().nullable(), role: z.string().nullable() })
  ),
  sampleImageUrl: z.string().nullable(),
})
export const printResponse = z.strictObject({
  print: z.strictObject({
    orderCode: z.string(),
    createdDate: z.string(),
    deliveryWindow: z.string(),
    recipientInfo: z.strictObject({ name: z.string(), phone: z.string(), address: z.string() }),
    cardMessage: z.string(),
    items: z.array(z.strictObject({ name: z.string(), quantity: z.number(), price: z.number(), subtotal: z.number() })),
    totalVnd: z.number(),
    floristNote: z.string(),
    florist: z.array(floristItem),
  }),
})
export const floristQueueResponse = data(
  z.array(
    z.strictObject({
      orderId: z.string(),
      code: z.string(),
      productionStatus: PRODUCTION_STATUS,
      deliveryWindow: deliveryWindow.nullable(),
      cardMessage: z.string().nullable(),
      difficulty: z.string().nullable(),
      assignedAt: z.string(),
      assigneeId: z.string(),
      assigneeName: z.string().nullable(),
      items: z.array(floristItem),
    })
  )
)
export const floristWorkResponse = z.strictObject({ productionStatus: PRODUCTION_STATUS })

const infoRequest = z.strictObject({
  id: z.string(),
  orderId: z.string(),
  orderCode: z.string(),
  field: z.string(),
  label: z.string(),
  reason: z.string(),
  requestedFrom: z.string(),
  requestedBy: z.string(),
  requestedAt: z.string(),
  dueAt: z.string().nullable(),
  status: z.string(),
  responseValue: z.string().nullable(),
  cancelledReason: z.string().nullable(),
})
export const infoRequestsResponse = data(z.array(infoRequest))
export const infoRequestResponse = data(infoRequest)
export const okResponse = z.strictObject({ ok: z.literal(true) })

export const quoteOrderResponse = z.strictObject({ orderId: z.string(), totalVnd: z.number() })
export const orderVatResponse = data(
  z.strictObject({
    orderId: z.string(),
    vatEnabled: z.boolean(),
    vatRate: z.number(),
    vatAmountVnd: z.number(),
    subtotalVnd: z.number(),
    totalVnd: z.number(),
    paidVnd: z.number(),
    balanceVnd: z.number(),
    companyName: z.string().nullable(),
    taxCode: z.string().nullable(),
    companyAddress: z.string().nullable(),
    email: z.string().nullable(),
  })
)
export const orderPaymentResponse = z.strictObject({
  orderId: z.string(),
  orderCode: z.string(),
  paymentId: z.string(),
  kind: z.enum(["DEPOSIT", "BALANCE"]),
  paidVnd: z.number(),
  balanceVnd: z.number(),
})
const requestRef = { id: z.string(), status: z.string(), basis: z.string().nullable(), collectDueAt: z.string().nullable() }
export const deliverBeforePayResponse = z.strictObject({ request: z.strictObject(requestRef), message: z.string() })
export const decisionResponse = z.strictObject({ status: z.string() })
export const approvalRequestsResponse = items(
  z.strictObject({
    id: z.string(),
    kind: z.string(),
    status: z.string(),
    basis: z.string().nullable(),
    reason: z.string(),
    requestedBy: z.string(),
    requestedAt: z.string(),
    decidedBy: z.string().nullable(),
    decidedAt: z.string().nullable(),
    decisionNote: z.string().nullable(),
    collectDueAt: z.string().nullable(),
    order: z.strictObject({ id: z.string(), code: z.string(), totalVnd: z.number(), paidVnd: z.number(), balanceVnd: z.number() }),
  })
)
export const deliverBeforePaySettingsResponse = z.strictObject({
  allowSelfDecide: z.boolean(),
  selfDecideMaxVnd: z.number(),
  minCompletedOrders: z.number(),
  collectDueDays: z.number(),
  customerDebtCapVnd: z.number().nullable(),
})
const flags = z.strictObject({ order: z.boolean().optional(), contact: z.boolean().optional() })
export const entryActionsResponse = z.strictObject({
  settings: z.strictObject({ default: flags.optional(), bySource: z.partialRecord(SOURCE_CODE, flags).optional() }),
  sources: z.array(z.strictObject({ code: SOURCE_CODE, label: z.string(), effective: z.strictObject({ order: z.boolean(), contact: z.boolean() }) })),
})
export const workbenchResponse = items(
  z.strictObject({
    id: z.string(),
    code: z.string(),
    sourceLabel: z.string(),
    status: ORDER_STATUS,
    totalVnd: z.number(),
    paidVnd: z.number(),
    balanceVnd: z.number(),
    recipientName: z.string().nullable(),
    phone: z.string().nullable(),
    createdAt: z.string(),
    stage: z.enum(["NEEDS_QUOTE", "AWAITING_PAYMENT", "AWAITING_APPROVAL", "IN_COORDINATION", "DELIVERED_UNPAID"]),
    request: z.strictObject(requestRef).nullable(),
    collectOverdue: z.boolean(),
  })
)
export const coordinationQueueResponse = items(
  z.strictObject({
    orderId: z.string(),
    code: z.string(),
    sourceLabel: z.string(),
    stageLabel: z.string(),
    atRisk: z.boolean(),
    nextAction: z.string().nullable(),
    nextActionDue: z.string().nullable(),
    deliveryDate: z.string().nullable(),
    deliveryTimeSlot: z.string().nullable(),
    recipientName: z.string().nullable(),
    balanceVnd: z.number(),
  })
)
export const leadQueueResponse = z.strictObject({
  items: z.array(
    z.strictObject({
      key: z.string(),
      kind: z.enum(["LEAD", "BROCHURE_SESSION"]),
      name: z.string().nullable(),
      phone: z.string().nullable(),
      sourceLabel: z.string(),
      reasonLabel: z.string(),
      heat: z.enum(["HOT", "WARM", "COLD"]),
      status: z.string(),
      assigneeUserId: z.string().nullable(),
      nextFollowUpAt: z.string().nullable(),
      lastActivityAt: z.string(),
      href: z.string(),
    })
  ),
  counts: z.strictObject({ total: z.number(), hot: z.number(), dueFollowUp: z.number() }),
})

// ── Báo giá ──────────────────────────────────────────────────────────────────────────────────────────────
const QUOTATION_STATUS = z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED"])
const party = z.strictObject({ id: z.string(), name: z.string(), phone: z.string() })
export const quotation = z.strictObject({
  id: z.string(),
  organizationId: z.string(),
  code: z.string(),
  publicToken: z.string(),
  leadId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  assetUsageId: z.string().nullable().optional(),
  status: QUOTATION_STATUS,
  validUntil: timestamp.nullable().optional(),
  subtotal: z.number(),
  discountAmount: z.number(),
  shippingFee: z.number(),
  totalAmount: z.number(),
  terms: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  convertedOrderId: z.string().nullable().optional(),
  createdBy: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
  items: z.array(
    z.strictObject({
      id: z.string().optional(),
      productId: z.string().nullable().optional(),
      name: z.string(),
      variantLabel: z.string().nullable().optional(),
      qty: z.number(),
      unitPrice: z.number(),
      totalPrice: z.number(),
      note: z.string().nullable().optional(),
    })
  ),
  lead: party.nullable().optional(),
  customer: party.nullable().optional(),
})
export const quotationResponse = data(quotation)
export const quotationsResponse = z.strictObject({
  data: z.array(quotation),
  total: z.number(),
  counts: z.strictObject({ DRAFT: z.number(), SENT: z.number(), ACCEPTED: z.number(), REJECTED: z.number(), EXPIRED: z.number(), CONVERTED: z.number() }),
  next_cursor: z.string().optional(),
})
export const quotationRevisionsResponse = data(z.array(z.strictObject({ version: z.number(), snapshot: z.unknown(), createdBy: z.string(), createdAt: timestamp })))
export const convertQuotationResponse = data(z.strictObject({ quotation, order }))
