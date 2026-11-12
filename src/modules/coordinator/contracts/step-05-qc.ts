/**
 * Bước 05: Kiểm định chất lượng (T14–T15).
 * Người kiểm kết luận PASSED / REWORK_REQUESTED / REJECTED; không đạt bắt buộc lý do. Điểm AI chỉ ghi khi có lượt Vision thật (nợ #140).
 *
 * Input = đúng zod mà route dùng (`adapters/http-schemas.ts`), output = đúng
 * hình dạng route trả (`order-view.ts`). Trước 25/09 hợp đồng này mô tả một
 * endpoint không tồn tại với mã quyền `O1` không có trong danh mục.
 */

import { qcInspectionSchema } from "../adapters/http-schemas"
import { defineStep } from "./define-step"
import { CoordinatorOrderResponseSchema, exampleOrderView } from "./order-view"

export const Step05QCInspectionInputSchema = qcInspectionSchema
export const Step05QCInspectionOutputSchema = CoordinatorOrderResponseSchema

export const step05QCInspectionContract = defineStep({
  id: "05",
  step: 5,
  code: "QUALITY_CHECK",
  slug: "quality-check",
  title: "Kiểm định chất lượng",
  summary: "Người kiểm kết luận PASSED / REWORK_REQUESTED / REJECTED; không đạt bắt buộc lý do. Điểm AI chỉ ghi khi có lượt Vision thật (nợ #140)",
  endpoint: {
    method: "POST",
    path: "/api/v1/coordinator/orders/{id}/qc",
    capability: "R3",
  },
  input: Step05QCInspectionInputSchema,
  output: Step05QCInspectionOutputSchema,
  examples: {
    input: { decision: "PASSED", checklist: { flowerMatch: true, colorTone: true, wrapping: true, cardMessage: true } },
    output: { order: exampleOrderView({ stage: "DISPATCHING", stageLabel: "Đang giao hàng", qc: { status: "PASSED", notes: null, aiScore: null, inspectedAt: "2026-09-25T08:40:00.000Z" } }) },
  },
})
