import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-final"
import * as res from "./responses-final"

/** Operation nhóm cuối (OpenAPI nội bộ, PO 07/11/2026). */
const LINK = "Link catalog"
const PI = "Phân tích sản phẩm"
const CRON = "Tác vụ định kỳ (cron)"
const NF = "Của tổ chức khác hoặc mã lạ → 404."
const CRON_AUTH = "Không dùng phiên: header `x-cron-secret` phải khớp `CRON_SECRET` (production thiếu biến → luôn từ chối); sai/thiếu → 401."

export const FINAL_OPERATIONS: OpenApiOperation[] = [
  op(LINK, { method: "get", path: "/catalog-links", operationId: "listCatalogLinks", summary: "Link catalog của tổ chức", cap: "J1", query: req.catalogLinksQuery,
    description: "Mặc định ẩn link đã thu hồi; `include_revoked=true` để thấy cả.", ok: [200, { description: "Link", schema: res.catalogLinksResponse }], errors: [400] }),
  op(LINK, { method: "post", path: "/catalog-links", operationId: "createCatalogLink", summary: "Tạo link catalog", cap: "J1", body: req.createCatalogLinkBody,
    description: "`slug` tự sinh nếu bỏ trống; có dấu/ký tự lạ được chuẩn hoá (`Có Dấu!` → `co-dau`). Trùng → 400 `details.slug`.", ok: [201, { description: "Link", schema: res.catalogLinkCreatedResponse }], errors: BODY_ERRORS }),
  op(LINK, { method: "get", path: "/catalog-links/{slug}", operationId: "getCatalogLinkPublic", summary: "Xem link catalog (khách quét QR, không đăng nhập)", cap: null, auth: "public",
    description: "Công khai có chủ đích. Link đã thu hồi hoặc mã lạ → 404. Thân không bọc `{ data }`; có `created_by` (mã người tạo, audit API §32).", ok: [200, { description: "Link", schema: res.catalogLinkPublicResponse }], errors: [404] }),
  op(LINK, { method: "patch", path: "/catalog-links/{slug}", operationId: "updateCatalogLink", summary: "Sửa tên, mô tả, bộ lọc", cap: "J1", body: req.updateCatalogLinkBody,
    description: `Thân không bọc \`{ data }\`. ${NF}`, ok: [200, { description: "Link", schema: res.catalogLinkResponse }], errors: [...BODY_ERRORS, 404] }),
  op(LINK, { method: "post", path: "/catalog-links/{slug}/revoke", operationId: "revokeCatalogLink", summary: "Thu hồi link (không xoá bản ghi)", cap: "J2",
    description: `Đã thu hồi rồi → 400. ${NF}`, ok: [200, { description: "Đã thu hồi", schema: res.catalogLinkRevokedResponse }], errors: [400, 404] }),

  op(PI, { method: "get", path: "/product-intelligence/{id}", operationId: "getProductIntelligenceReport", summary: "Tra lại một lượt phân tích sản phẩm đã lưu", cap: "V2",
    description: `\`id\` là lượt chạy (\`product_analysis_runs\`); không thấy thì thử bản phân tích ảnh (\`product_analyses\`) và dựng báo cáo dự phòng từ dữ liệu gốc. \`imageUrl\` ký mới mỗi lần đọc. ${NF}`,
    ok: [200, { description: "Báo cáo", schema: res.productIntelligenceResponse }], errors: [404] }),

  op(CRON, { method: "get", path: "/internal/health", operationId: "getInternalHealth", summary: "Sức khoẻ chi tiết: CSDL, Redis, job tồn đọng, worker", cap: null, auth: "public",
    description: `${CRON_AUTH} 401 trả thân cũ \`{ error: "Unauthorized" }\`. Không khoẻ → 503 cùng thân (cron \`curl -f\` thất bại để báo động).`,
    ok: [200, { description: "Khoẻ", schema: res.healthResponse }], errors: [401, 503] }),
  op(CRON, { method: "post", path: "/internal/integrations-sweep", operationId: "runIntegrationsSweep", summary: "Xử lý sự kiện tích hợp đến hạn, kiểm kết nối, kéo đơn kênh bán", cap: null, auth: "public",
    description: `${CRON_AUTH} Mỗi lượt có giới hạn (100 sự kiện, 50 lượt kiểm, 20 kết nối kênh bán).`, ok: [200, { description: "Kết quả", schema: res.integrationsSweepResponse }], errors: [401] }),
  op(CRON, { method: "post", path: "/internal/chain-dispatch-sweep", operationId: "runChainDispatchSweep", summary: "Quét nhắc mốc đơn gia công và các tác vụ dọn định kỳ", cap: null, auth: "public",
    description: `${CRON_AUTH} 401 trả thân cũ. Nhắc mốc M1–M4, chuyển vòng điều phối, job kẹt, thùng rác, khoá idempotent, mã hoá dữ liệu cá nhân cũ, báo giá hết hạn, gói thuê bao. Tác vụ con hỏng → trường đó \`null\`, lượt vẫn 200. Có ngân sách thời gian; \`complete: false\` → lượt sau đi tiếp.`,
    ok: [200, { description: "Kết quả", schema: res.dispatchSweepResponse }], errors: [401] }),
]
