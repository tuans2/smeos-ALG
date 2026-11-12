/**
 * Bước 07: Nghiệm thu & Đóng đơn (T25–T27).
 * Chỉ khi DELIVERED và không còn sự cố mở; chốt điểm + tiền công đối tác, ghi audit.
 *
 * Input = đúng zod mà route dùng (`adapters/http-schemas.ts`), output = đúng
 * hình dạng route trả (`order-view.ts`). Trước 25/09 hợp đồng này mô tả một
 * endpoint không tồn tại với mã quyền `O1` không có trong danh mục.
 */

import { closeOrderSchema } from "../adapters/http-schemas"
import { defineStep } from "./define-step"
import { CoordinatorOrderResponseSchema, exampleOrderView } from "./order-view"

export const Step07CloseLearnInputSchema = closeOrderSchema
export const Step07CloseLearnOutputSchema = CoordinatorOrderResponseSchema

export const step07CloseLearnContract = defineStep({
  id: "07",
  step: 7,
  code: "CLOSE_LEARN",
  slug: "close-learn",
  title: "Nghiệm thu & Đóng đơn",
  summary: "Chỉ khi DELIVERED và không còn sự cố mở; chốt điểm + tiền công đối tác, ghi audit",
  endpoint: {
    method: "POST",
    path: "/api/v1/coordinator/orders/{id}/close",
    capability: "R3",
  },
  input: Step07CloseLearnInputSchema,
  output: Step07CloseLearnOutputSchema,
  examples: {
    input: { partnerRating: 5, partnerPayoutVnd: 350000, notes: "Giao sớm 5 phút" },
    output: { order: exampleOrderView({ stage: "COMPLETED", stageLabel: "Hoàn tất", partnerRating: 5, partnerPayoutVnd: 350000, closureNotes: "Giao sớm 5 phút", closedAt: "2026-09-25T10:05:00.000Z" }) },
  },
})
