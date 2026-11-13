/**
 * Bước 03: Phân công đối tác xưởng (T06).
 * Gán đối tác cùng tổ chức, kiểm tạm ngưng và công suất ngày; đơn vào IN_PRODUCTION.
 *
 * Input = đúng zod mà route dùng (`adapters/http-schemas.ts`), output = đúng
 * hình dạng route trả (`order-view.ts`). Trước 25/09 hợp đồng này mô tả một
 * endpoint không tồn tại với mã quyền `O1` không có trong danh mục.
 */

import { assignPartnerSchema } from "../adapters/http-schemas"
import { defineStep } from "./define-step"
import { CoordinatorOrderResponseSchema, exampleOrderView } from "./order-view"

export const Step03AssignPartnerInputSchema = assignPartnerSchema
export const Step03AssignPartnerOutputSchema = CoordinatorOrderResponseSchema

export const step03AssignPartnerContract = defineStep({
  id: "03",
  step: 3,
  code: "ASSIGN_PARTNER",
  slug: "assign-partner",
  title: "Phân công đối tác xưởng",
  summary: "Gán đối tác cùng tổ chức, kiểm tạm ngưng và công suất ngày; đơn vào IN_PRODUCTION",
  endpoint: {
    method: "POST",
    path: "/api/v1/coordinator/orders/{id}/assign-partner",
    capability: "R4",
  },
  input: Step03AssignPartnerInputSchema,
  output: Step03AssignPartnerOutputSchema,
  examples: {
    input: { partner_id: "0b7f4a52-2c1e-4a8f-9c3d-5e6f7a8b9c0d", notes: "Ưu tiên hồng nhập sáng nay" },
    output: { order: exampleOrderView({ stage: "IN_PRODUCTION", stageLabel: "Đang chế tác", partner: { id: "0b7f4a52-2c1e-4a8f-9c3d-5e6f7a8b9c0d", name: "Flora Boutique Ba Đình", phone: "0912345678" }, partnerName: "Flora Boutique Ba Đình", nextAction: "Xưởng Flora Boutique Ba Đình đang cắm theo BOM" }) },
  },
})
