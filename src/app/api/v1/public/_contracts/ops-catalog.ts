import type { OpenApiOperation } from "@/core/http/openapi"

import * as req from "./requests"
import * as res from "./responses-catalog"

/** Operation Catalog công khai — vùng đóng băng: tài liệu hoá; riêng rate limit của GET do PO cho sửa 07/11/2026. */
export const CATALOG_OPERATIONS: OpenApiOperation[] = [
  {
    method: "get", path: "/public/catalog/{slug}", operationId: "publicGetCatalog", tags: ["Catalog công khai"],
    summary: "Trang catalog công khai của tiệm",
    description: "Catalog đã thu hồi vẫn 200 với `status: REVOKED`. Giới hạn 60 lần/phút/IP (PO 07/11/2026, audit API-09).",
    security: [],
    responses: { 200: { description: "Catalog đang mở hoặc đã thu hồi", schema: res.publicCatalogResponse } }, errors: [404, 429],
  },
  {
    method: "post", path: "/public/catalog/{slug}/lead", operationId: "publicCatalogLead", tags: ["Catalog công khai"],
    summary: "Khách để lại thông tin liên hệ",
    description: "Ghi `leads` + khách CRM + đồng ý liên hệ. Chặn máy: 10 lần/10 phút/IP, ô bẫy `website`, Turnstile khi bật; mỗi SĐT 3 lead/giờ/tiệm.",
    security: [], body: req.catalogLeadBody,
    responses: { 201: { description: "Đã ghi lead", schema: res.catalogLeadResponse } }, errors: [400, 404, 413, 422, 429],
  },
  {
    method: "post", path: "/public/catalog/{slug}/order", operationId: "publicCatalogOrder", tags: ["Catalog công khai"],
    summary: "Đặt hàng trên catalog công khai",
    description: "Đơn vào `orders` nguồn `CATALOG`. Tiệm tắt nút Đặt hàng hoặc gói quá hạn → từ chối. Giới hạn 10 lần/10 phút/IP.",
    security: [], body: req.catalogOrderBody,
    responses: { 201: { description: "Đơn đã tạo", schema: res.catalogOrderResponse } }, errors: [400, 402, 404, 409, 413, 422, 429],
  },
]
