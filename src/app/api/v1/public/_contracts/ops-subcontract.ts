import type { OpenApiOperation } from "@/core/http/openapi"

import * as req from "./requests"
import * as res from "./responses-subcontract"

/**
 * Operation Thẻ Gia Công công khai `/public/subcontract/{orderCode}/*` (audit API đợt 6): link ký riêng cho
 * từng chi nhánh được mời (`?t=` hoặc header `x-subcontract-token`). Sai token / chi nhánh / tổ chức → 404.
 */
const TAG = ["Thẻ Gia Công"]
const SEC = ["subcontractToken"]
const P = (path: string) => `/public/subcontract/{orderCode}${path}`

export const SUBCONTRACT_OPERATIONS: OpenApiOperation[] = [
  { method: "get", path: P(""), operationId: "subcontractView", tags: TAG, summary: "Chi nhánh xem Thẻ Gia Công",
    description: "SĐT người nhận che khi chưa nhận đơn; shipper và yêu cầu bỏ qua chỉ hiện cho chi nhánh đang làm. 120 lần/phút/IP.",
    security: SEC, query: req.subcontractViewQuery, responses: { 200: { description: "Thẻ Gia Công", schema: res.subcontractViewResponse } }, errors: [404, 429] },
  { method: "post", path: P(""), operationId: "subcontractAction", tags: TAG, summary: "Nhận đơn / huỷ trong hạn / xác nhận làm / xoá ảnh thành phẩm",
    description: "`CLAIM` (người nhận trước thắng), `CANCEL` (trong hạn kiểm kho, trừ điểm chất lượng), `COMMIT`, `DELETE_QC` (ảnh đã duyệt → 409). 30 lần/phút/IP.",
    security: SEC, body: req.subcontractActionBody, responses: { 200: { description: "Kết quả theo `action`", schema: res.subcontractActionResponse } }, errors: [400, 404, 409, 413, 422, 429] },
  { method: "post", path: P("/request-bypass"), operationId: "subcontractRequestBypass", tags: TAG, summary: "Xin Điều phối cho bỏ qua bằng chứng một công đoạn",
    description: "Chỉ chi nhánh đang làm; đang chờ / đã duyệt → 409. 20 lần/phút/IP.",
    security: SEC, body: req.subcontractBypassBody, responses: { 200: { description: "Đã gửi yêu cầu", schema: res.subcontractBypassResponse } }, errors: [400, 404, 409, 413, 422, 429] },
  { method: "post", path: P("/upload-qc"), operationId: "subcontractUploadQc", tags: TAG, summary: "Gửi ảnh thành phẩm",
    description: "AI đối chiếu với ảnh mẫu trước khi lưu: không khớp / không chắc → 422. Chưa tới bước → 409. 30 lần/phút/IP.",
    security: SEC, multipart: req.subcontractQcForm, responses: { 200: { description: "Ảnh đã lưu", schema: res.subcontractQcResponse } }, errors: [400, 404, 409, 413, 422, 429] },
  { method: "post", path: P("/submit-shipper"), operationId: "subcontractSubmitShipper", tags: TAG, summary: "Báo shipper",
    description: "Còn chờ khách duyệt ảnh thành phẩm → 409. Gửi lại khi đã có → trả bản đã lưu. 20 lần/phút/IP.",
    security: SEC, body: req.subcontractShipperBody, responses: { 200: { description: "Thông tin shipper", schema: res.subcontractShipperResponse } }, errors: [400, 404, 409, 413, 422, 429] },
  { method: "post", path: P("/submit-delivery"), operationId: "subcontractSubmitDelivery", tags: TAG, summary: "Báo đã giao kèm ảnh",
    description: "AI kiểm ảnh giao hàng: không đạt → 422. Chưa tới bước → 409. 30 lần/phút/IP.",
    security: SEC, multipart: req.subcontractDeliveryForm, responses: { 200: { description: "Đã giao", schema: res.subcontractDeliveryResponse } }, errors: [400, 404, 409, 413, 422, 429] },
]
