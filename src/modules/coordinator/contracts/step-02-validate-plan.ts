/**
 * Bước 02: Thẩm định & Lập kế hoạch (T02).
 * Chuyển INTAKE → VALIDATING/PLANNING → ASSIGNING; máy chủ kiểm luồng và bằng chứng (409 nếu sai).
 *
 * Input = đúng zod mà route dùng (`adapters/http-schemas.ts`), output = đúng
 * hình dạng route trả (`order-view.ts`). Trước 25/09 hợp đồng này mô tả một
 * endpoint không tồn tại với mã quyền `O1` không có trong danh mục.
 */

import { updateStageSchema } from "../adapters/http-schemas"
import { defineStep } from "./define-step"
import { CoordinatorOrderResponseSchema, exampleOrderView } from "./order-view"

export const Step02ValidatePlanInputSchema = updateStageSchema
export const Step02ValidatePlanOutputSchema = CoordinatorOrderResponseSchema

export const step02ValidatePlanContract = defineStep({
  id: "02",
  step: 2,
  code: "VALIDATE_PLAN",
  slug: "validate-plan",
  title: "Thẩm định & Lập kế hoạch",
  summary: "Chuyển INTAKE → VALIDATING/PLANNING → ASSIGNING; máy chủ kiểm luồng và bằng chứng (409 nếu sai)",
  endpoint: {
    method: "PATCH",
    path: "/api/v1/coordinator/orders/{id}/stage",
    capability: "R3",
  },
  input: Step02ValidatePlanInputSchema,
  output: Step02ValidatePlanOutputSchema,
  examples: {
    input: { stage: "PLANNING", nextAction: "Chốt giờ lấy hàng 16:30" },
    output: { order: exampleOrderView({ stage: "PLANNING", stageLabel: "Lập kế hoạch", nextAction: "Chốt giờ lấy hàng 16:30" }) },
  },
})
