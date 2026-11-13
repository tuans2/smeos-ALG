import { z } from "zod"
import { actionDone } from "./responses-actions"

import { data, timestamp } from "./responses-orders"

/**
 * Phản hồi khách hàng `/api/v1/crm/*` (OpenAPI nội bộ, PO 07/11/2026). Sinh từ kiểu TS của use-case
 * (`src/modules/crm`, `CustomerMasterIndex`) rồi kiểm bằng phản hồi thật ở
 * `tests/tenant/internal-contract-crm.test.ts`.
 */
export const customerMasterIndex = z.strictObject({
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
    z.strictObject({
      channel: z.enum(["ZALO_ZNS", "SMS", "PHONE_CALL", "PROMOTION"]),
      granted: z.boolean(),
      grantedAt: z.string(),
      revokedAt: z.string().optional(),
    })
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
export const customersResponse = z.strictObject({ items: z.array(customerMasterIndex), total: z.number() })
export const customerResponse = z.strictObject({ customer: customerMasterIndex })
export const customerMasterIndexResponse = z.strictObject({ masterIndex: customerMasterIndex })
export const deleteCustomerResponse = actionDone("deleted")
/** Bản ghi `customer_occasions`. */
export const occasionResponse = z.strictObject({
  occasion: z.strictObject({
    id: z.string(),
    organization_id: z.string(),
    customer_id: z.string(),
    name: z.string(),
    date: z.string(),
    is_recurring: z.boolean(),
    reminder_days_before: z.number(),
    recipient_name: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: timestamp,
  }),
})
/** Bản ghi `customer_consents`. */
export const consentResponse = z.strictObject({
  consent: z.strictObject({
    id: z.string(),
    organization_id: z.string(),
    customer_id: z.string(),
    channel: z.enum(["ZALO_ZNS", "SMS", "PHONE_CALL", "PROMOTION"]),
    granted: z.boolean(),
    granted_at: timestamp,
    revoked_at: timestamp.nullable(),
    created_at: timestamp,
    updated_at: timestamp,
  }),
})
export const customerOrdersResponse = data(
  z.array(
    z.strictObject({
      id: z.string(),
      code: z.string(),
      source: z.string().nullable(),
      status: z.string(),
      deliveryStatus: z.string(),
      totalVnd: z.number(),
      balanceVnd: z.number(),
      createdAt: z.string(),
      deliveryDate: z.string().nullable(),
      summary: z.string(),
    })
  )
)
export const upcomingRemindersResponse = z.strictObject({
  items: z.array(
    z.strictObject({
      customerId: z.string(),
      customerName: z.string(),
      customerPhone: z.string(),
      occasionName: z.string(),
      targetDate: z.string(),
      daysLeft: z.number(),
      recipientName: z.string(),
      suggestedFlower: z.string().nullable(),
      suggestedTone: z.string().nullable(),
      isZaloAllowed: z.boolean(),
    })
  ),
  count: z.number(),
  scannedAt: z.string(),
})

/** Yêu cầu của khách về dữ liệu cá nhân (ADR-014 D-P5) — `result` chỉ là số dòng theo bảng. */
export const dataRequest = z.strictObject({
  id: z.string(),
  customerId: z.string().nullable(),
  type: z.enum(["EXPORT", "ERASE", "RECTIFY"]),
  status: z.enum(["RECEIVED", "COMPLETED", "REJECTED"]),
  receivedBy: z.string(),
  receivedAt: timestamp,
  dueAt: timestamp,
  overdue: z.boolean(),
  note: z.string().nullable(),
  completedBy: z.string().nullable(),
  completedAt: timestamp.nullable(),
  result: z.record(z.string(), z.number()).nullable(),
})
export const dataRequestResponse = data(dataRequest)
export const dataRequestsResponse = data(z.array(dataRequest))
/** Gói xuất: mỗi mục là mảng bản ghi của khách (khách, dịp, đồng ý, tương tác, lead, phiên Thẻ chào, đơn, hội thoại, báo giá). */
export const dataExportResponse = data(z.strictObject({ request: dataRequest, package: z.record(z.string(), z.unknown()) }))
