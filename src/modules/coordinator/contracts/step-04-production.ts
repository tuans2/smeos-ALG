/**
 * Bước 04: Theo dõi sản xuất (T07–T11).
 * Cập nhật tiến độ; báo cắm xong bắt buộc kèm ảnh thành phẩm (assets cùng tổ chức) → QUALITY_CHECK; báo thiếu vật liệu mở sự cố.
 *
 * Input = đúng zod mà route dùng (`adapters/http-schemas.ts`), output = đúng
 * hình dạng route trả (`order-view.ts`). Trước 25/09 hợp đồng này mô tả một
 * endpoint không tồn tại với mã quyền `O1` không có trong danh mục.
 */

import { productionUpdateSchema } from "../adapters/http-schemas"
import { defineStep } from "./define-step"
import { CoordinatorOrderResponseSchema, exampleOrderView } from "./order-view"

export const Step04ProductionInputSchema = productionUpdateSchema
export const Step04ProductionOutputSchema = CoordinatorOrderResponseSchema

export const step04ProductionContract = defineStep({
  id: "04",
  step: 4,
  code: "PRODUCTION",
  slug: "production",
  title: "Theo dõi sản xuất",
  summary: "Cập nhật tiến độ; báo cắm xong bắt buộc kèm ảnh thành phẩm (assets cùng tổ chức) → QUALITY_CHECK; báo thiếu vật liệu mở sự cố",
  endpoint: {
    method: "POST",
    path: "/api/v1/coordinator/orders/{id}/production",
    capability: "R3",
  },
  input: Step04ProductionInputSchema,
  output: Step04ProductionOutputSchema,
  examples: {
    input: { action: "MARK_READY", progress_percent: 100, finished_asset_ids: ["a3c1d2e4-5f60-4718-9a2b-3c4d5e6f7a8b"] },
    output: { order: exampleOrderView({ stage: "QUALITY_CHECK", stageLabel: "Chờ kiểm định QC", productionProgress: 100, finishedImageUrls: ["/api/v1/storage/org/…/a3c1d2e4.jpg?exp=…&sig=…"] }) },
  },
})
