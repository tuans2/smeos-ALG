/**
 * Bước 06: Giao hàng & POD (T18–T21, F11/F12).
 * PICKED_UP → ON_THE_WAY → DELIVERED_SUCCESS (bắt buộc ảnh POD hoặc tên người ký) / DELIVERY_FAILED (mở sự cố).
 *
 * Input = đúng zod mà route dùng (`adapters/http-schemas.ts`), output = đúng
 * hình dạng route trả (`order-view.ts`). Trước 25/09 hợp đồng này mô tả một
 * endpoint không tồn tại với mã quyền `O1` không có trong danh mục.
 */

import { deliveryUpdateSchema } from "../adapters/http-schemas"
import { defineStep } from "./define-step"
import { CoordinatorOrderResponseSchema, exampleOrderView } from "./order-view"

export const Step06DeliveryInputSchema = deliveryUpdateSchema
export const Step06DeliveryOutputSchema = CoordinatorOrderResponseSchema

export const step06DeliveryContract = defineStep({
  id: "06",
  step: 6,
  code: "DELIVERY",
  slug: "delivery",
  title: "Giao hàng & POD (T18–T21, F11/F12)",
  summary: "PICKED_UP → ON_THE_WAY → DELIVERED_SUCCESS (bắt buộc ảnh POD hoặc tên người ký) / DELIVERY_FAILED (mở sự cố)",
  endpoint: {
    method: "POST",
    path: "/api/v1/coordinator/orders/{id}/delivery",
    capability: "R5",
  },
  input: Step06DeliveryInputSchema,
  output: Step06DeliveryOutputSchema,
  examples: {
    input: { event: "DELIVERED_SUCCESS", carrier: "AhaMove", shipper_name: "Lê Văn Hùng", shipper_phone: "0933221100", recipient_signed_name: "Trần Thị Bình" },
    output: { order: exampleOrderView({ stage: "DELIVERED", stageLabel: "Đã giao (chờ đóng đơn)", delivery: { carrier: "AhaMove", shipperName: "Lê Văn Hùng", shipperPhone: "0933221100", state: "DELIVERED_SUCCESS", podImageUrl: null, podRecipientName: "Trần Thị Bình", podCapturedAt: "2026-09-25T09:55:00.000Z", actualDeliveryAt: "2026-09-25T09:55:00.000Z" } }) },
  },
})
