import type { OpenApiOperation } from "@/core/http/openapi"

import * as req from "./requests"
import * as res from "./responses-utility"

/** Operation nhóm tiện ích & webhook công khai (audit API đợt 6). */
export const UTILITY_OPERATIONS: OpenApiOperation[] = [
  {
    method: "post", path: "/public/csp-report", operationId: "publicCspReport", tags: ["Tiện ích"],
    summary: "Nhận báo cáo vi phạm CSP từ trình duyệt", description: "Chỉ ghi log vài trường (chỉ thị, URL bị chặn, trang). Giới hạn 60 lần/phút/IP.",
    security: [], body: req.cspReportBody,
    responses: { 204: { description: "Đã nhận" } }, errors: [413, 429],
  },
  {
    method: "get", path: "/public/drive-thumbnail", operationId: "publicDriveThumbnail", tags: ["Tiện ích"],
    summary: "Tìm ảnh đầu tiên trong một thư mục Google Drive công khai", description: "Giới hạn 120 lần/phút/IP. Nhập hàng loạt nên dùng `POST /products/drive-thumbnails`.",
    security: [], query: req.driveFolderQuery,
    responses: { 200: { description: "Tệp ảnh đầu tiên (hoặc `null`)", schema: res.driveThumbnailResponse } }, errors: [400, 429],
  },
  {
    method: "get", path: "/public/drive-thumb-proxy", operationId: "publicDriveThumbProxy", tags: ["Tiện ích"],
    summary: "Tải hộ ảnh thu nhỏ từ Google Drive", description: "Truyền `file_id`, hoặc `folder_id` để lấy ảnh đầu tiên. Đệm công khai 1 ngày. Giới hạn 120 lần/phút/IP.",
    security: [], query: req.driveThumbProxyQuery,
    responses: { 200: { description: "Ảnh thu nhỏ", contentType: "image/*" }, 404: { description: "Không có ảnh — không thân" } }, errors: [400, 429],
  },
  {
    method: "post", path: "/public/integrations/{connector}/{ref}", operationId: "publicInboundWebhook", tags: ["Webhook"],
    summary: "Cổng webhook chung của Trung tâm Tích hợp",
    description: "Thân thô ≤ 256 KB, ký theo đầu nối (vd. `x-echo-signature`). Sai chữ ký / sai `ref` / kết nối đã ngắt đều 401. Chống trùng theo mã sự kiện. Giới hạn 300/phút/IP và 600/phút/`ref`.",
    security: ["connectorSignature"],
    responses: { 200: { description: "Số sự kiện nhận mới / trùng", schema: res.inboundWebhookResponse } }, errors: [401, 413, 429],
  },
  {
    method: "post", path: "/public/payments/sepay", operationId: "publicSepayWebhook", tags: ["Webhook"],
    summary: "Webhook SePay — tự ghi thu đơn Thẻ chào theo mã đơn trong nội dung chuyển khoản",
    description: "Khoá theo tiệm (`Authorization: Apikey <khoá>`). Chống trùng theo `id` giao dịch. Giới hạn 600/phút/IP.",
    security: ["sepayApiKey"], body: req.sepayWebhookBody,
    responses: { 200: { description: "Kết quả khớp giao dịch", schema: res.sepayWebhookResponse } }, errors: [400, 401, 413, 429],
  },
  {
    method: "post", path: "/public/zalo-oa/webhook", operationId: "publicZaloOaWebhook", tags: ["Webhook"],
    summary: "Webhook OA Zalo chung — liên kết chi nhánh bằng mã trong tin nhắn",
    description: "Ký `X-ZEvent-Signature` (App ID + thân + timestamp + secret), sự kiện cũ bị từ chối. Thân ≤ 64 KB. Lỗi 400/401/413 trả `{ error: \"chuỗi\" }` theo yêu cầu của nhà cung cấp (ngoại lệ envelope, ghi ở `api-envelope-legacy.txt`).",
    security: ["zaloSignature"], body: req.zaloOaEventBody,
    responses: { 200: { description: "Đã xử lý", schema: res.zaloOaWebhookResponse } }, errors: [429],
    extensions: { "x-legacy-error-envelope": true },
  },
  {
    method: "get", path: "/public/marketplace-share/{token}", operationId: "publicMarketplaceShare", tags: ["Tiện ích"],
    summary: "Xem marketplace đối tác qua link chia sẻ có hạn", description: "Thông tin liên hệ đã che. `noindex`. Giới hạn 60 lần/10 phút/IP.",
    security: [],
    responses: { 200: { description: "Danh sách cửa hàng", schema: res.marketplaceShareResponse } }, errors: [404, 429],
  },
  {
    method: "get", path: "/public/quotation/{token}", operationId: "publicQuotation", tags: ["Tiện ích"],
    summary: "Xem báo giá đã gửi cho khách", description: "Không trả SĐT, ghi chú nội bộ, giá vốn. Báo giá nháp/không tồn tại → 404; quá hạn hiện `EXPIRED`.",
    security: [],
    responses: { 200: { description: "Báo giá", schema: res.publicQuotationResponse } }, errors: [404, 429],
  },
]
