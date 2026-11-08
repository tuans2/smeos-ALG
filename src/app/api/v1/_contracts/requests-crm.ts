import { z } from "zod"

/**
 * Lược đồ yêu cầu của khách hàng `/api/v1/crm/*` (OpenAPI nội bộ, PO 07/11/2026). Route đọc thân thô và use-case
 * tự kiểm (tên, số điện thoại Việt Nam, ngày dịp) — đây là lược đồ MÔ TẢ theo kiểu đầu vào của use-case
 * (`customer-repository.interface.ts`); test hợp đồng trên CSDL thật gửi đúng các thân này.
 */
export const CONSENT_CHANNELS = ["ZALO_ZNS", "SMS", "PHONE_CALL", "PROMOTION"] as const

const customerFields = {
  email: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  preferredFlowers: z.array(z.string()).optional(),
  preferredColors: z.array(z.string()).optional(),
}
/** `createCustomer` — tên không rỗng; số điện thoại Việt Nam hợp lệ, chuẩn hoá, trùng trong tổ chức → 409. */
export const createCustomerBody = z.object({ name: z.string().min(1), phone: z.string().min(1), ...customerFields })
/** `updateCustomer` — mọi trường tuỳ chọn; đổi số điện thoại kiểm như khi tạo. */
export const updateCustomerBody = z.object({ name: z.string().min(1).optional(), phone: z.string().min(1).optional(), ...customerFields })
/** `addCustomerOccasion` — `date` dạng `MM-DD` hoặc `YYYY-MM-DD`. */
export const addOccasionBody = z.object({
  name: z.string().min(1),
  date: z.string().min(1),
  isRecurring: z.boolean().optional(),
  reminderDaysBefore: z.number().int().optional(),
  recipientName: z.string().optional(),
  notes: z.string().optional(),
})
/** Route kiểm `channel`; `granted` thiếu → `false` (thu hồi). */
export const consentBody = z.object({ channel: z.enum(CONSENT_CHANNELS), granted: z.boolean().optional() })

const TIER = z.enum(["NEW", "BRONZE", "SILVER", "GOLD", "VIP"])
export const listCustomersQuery = z.object({
  tier: TIER.optional(),
  search: z.string().optional(),
  /** Mặc định 50. */
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
})
export const exportCustomersQuery = z.object({ format: z.enum(["xlsx", "json"]).optional(), tier: TIER.optional(), search: z.string().optional() })
/** Số ngày quét tới, mặc định 14. */
export const remindersQuery = z.object({ days: z.string().regex(/^\d+$/).optional() })
