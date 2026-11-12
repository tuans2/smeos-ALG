/**
 * Bước 01: Tiếp nhận đơn (T01).
 * Sales/AI Chat tạo đơn; máy chủ cấp mã FLR-YYMMDD-NNNN, bước INTAKE.
 *
 * Input = đúng zod mà route dùng (`adapters/http-schemas.ts`), output = đúng
 * hình dạng route trả (`order-view.ts`). Trước 25/09 hợp đồng này mô tả một
 * endpoint không tồn tại với mã quyền `O1` không có trong danh mục.
 */

import { createOrderSchema } from "../adapters/http-schemas"
import { defineStep } from "./define-step"
import { CoordinatorOrderResponseSchema, exampleOrderView } from "./order-view"

export const Step01IntakeInputSchema = createOrderSchema
export const Step01IntakeOutputSchema = CoordinatorOrderResponseSchema

export const step01IntakeContract = defineStep({
  id: "01",
  step: 1,
  code: "INTAKE",
  slug: "intake",
  title: "Tiếp nhận đơn",
  summary: "Sales/AI Chat tạo đơn; máy chủ cấp mã FLR-YYMMDD-NNNN, bước INTAKE",
  endpoint: {
    method: "POST",
    path: "/api/v1/coordinator/orders",
    capability: "R2",
  },
  input: Step01IntakeInputSchema,
  output: Step01IntakeOutputSchema,
  examples: {
    input: {
      customerName: "Nguyễn Văn An",
      customerTier: "VIP",
      customerPhone: "0987654321",
      recipientName: "Trần Thị Bình",
      recipientPhone: "0901234567",
      deliveryAddress: { street: "123 Phố Huế", ward: "Phường Ngô Thì Nhậm", district: "Quận Hai Bà Trưng", city: "Hà Nội" },
      deliveryTargetTime: "17:00 hôm nay",
      deliveryTargetAt: "2026-09-25T17:00:00+07:00",
      productTitle: "Sản phẩm hồng Pastel",
      unitPriceVnd: 850000,
      flowers: [{ flowerName: "Hồng Ohara", quantity: 12, unit: "cành", color: "hồng phấn", role: "Chủ đạo" }],
      cardMessage: "Chúc mừng sinh nhật!",
    },
    output: { order: exampleOrderView({}) },
  },
})
