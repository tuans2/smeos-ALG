import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-integrations"
import * as res from "./responses-integrations"

/** Operation `/integrations/*`, `/integration-tokens/*`, `/sso/refresh` (OpenAPI nội bộ, PO 07/11/2026). */
const HUB = "Trung tâm Tích hợp — kết nối"
const SALES = "Trung tâm Tích hợp — kênh bán"
const GOV = "Trung tâm Tích hợp — quản trị chuỗi"
const TOKEN = "Token tích hợp & SSO"
const UC = "Mã năng lực kiểm ở use-case."
const NF = "Kết nối của tổ chức khác hoặc đã ngắt → 404."
const MANAGED = "Kết nối của tích hợp quản lý ở phân hệ khác (`managed`) → 422."
const SALES_NF = "Kết nối không phải kênh bán, đã ngắt hoặc của tổ chức khác → 404; kết nối đang lỗi/hết hạn hoặc cấp trên đã khoá kênh → 422."

export const INTEGRATION_HUB_OPERATIONS: OpenApiOperation[] = [
  op(HUB, { method: "get", path: "/integrations", operationId: "getIntegrationHub", summary: "Tổng quan, danh mục theo tầng/gói và kết nối của tổ chức", cap: "W1",
    description: `${UC} Không trả khoá — chỉ \`credentialHint\`.`, ok: [200, { description: "Trung tâm Tích hợp", schema: res.hubResponse }] }),
  op(HUB, { method: "post", path: "/integrations/connections", operationId: "connectIntegration", summary: "Kết nối bằng khoá người dùng nhập", cap: "W2", body: req.connectBody,
    description: `${UC} Máy chủ kiểm khoá với nhà cung cấp rồi mới lưu (mã hoá). Đầu nối lạ hoặc bị ẩn → 404; khoá sai → 400; cấp trên đã khoá, đang dùng kết nối của cấp trên, hoặc đầu nối không nhận khoá → 422 (\`details.violation\`); gói chưa có tích hợp → 403 \`ENTITLEMENT_REQUIRED\`. Sai lược đồ → 400 \`details.issues\` là danh sách đường dẫn trường.`,
    ok: [201, { description: "Kết nối", schema: res.connectionResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(HUB, { method: "delete", path: "/integrations/connections/{id}", operationId: "disconnectIntegration", summary: "Ngắt kết nối", cap: "W2",
    description: `${UC} Thu hồi phía nhà cung cấp nếu hỗ trợ, xoá khoá đã lưu. ${NF} ${MANAGED}`,
    ok: [200, { description: "Đã ngắt", schema: res.disconnectedResponse }], errors: [404, 422] }),
  op(HUB, { method: "post", path: "/integrations/connections/{id}/rotate", operationId: "rotateIntegrationSecret", summary: "Đổi khoá — kiểm khoá mới trước khi thay", cap: "W3",
    body: req.rotateSecretBody, description: `${UC} Thiếu khoá hoặc khoá mới không dùng được → 400. ${NF} ${MANAGED}`,
    ok: [200, { description: "Kết nối", schema: res.connectionResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(HUB, { method: "post", path: "/integrations/connections/{id}/test", operationId: "testIntegration", summary: "Kiểm tra kết nối ngay", cap: "W3",
    description: `${UC} Cập nhật trạng thái và \`lastHealthAt\`. ${NF} ${MANAGED}`, ok: [200, { description: "Kết nối", schema: res.connectionResponse }], errors: [404, 422] }),
  op(HUB, { method: "get", path: "/integrations/connections/{id}/events", operationId: "listIntegrationEvents", summary: "Nhật ký sự kiện của kết nối", cap: "W1",
    query: req.connectionEventsQuery, description: `${UC} \`limit\` 1–100, sai → 400. ${NF}`, ok: [200, { description: "Sự kiện", schema: res.eventsResponse }], errors: [400, 404] }),
  op(HUB, { method: "post", path: "/integrations/events/{id}/replay", operationId: "replayIntegrationEvent", summary: "Đưa sự kiện lỗi về hàng chờ", cap: "W5",
    description: `${UC} Chỉ sự kiện \`FAILED\`/\`DEAD\` — khác hoặc của tổ chức khác → 404; đầu nối không xử lý lại được → 422.`,
    ok: [200, { description: "Đã đưa về hàng chờ", schema: res.replayedResponse }], errors: [404, 422] }),

  op(SALES, { method: "get", path: "/integrations/connections/{id}/sales", operationId: "getSalesChannel", summary: "Tin đăng và đơn gần đây của kênh bán", cap: "W1",
    description: `${UC} Tối đa 100 tin và 50 đơn gần nhất. ${SALES_NF}`, ok: [200, { description: "Kênh bán", schema: res.salesResponse }], errors: [404] }),
  op(SALES, { method: "post", path: "/integrations/connections/{id}/sales/publish", operationId: "publishToSalesChannel", summary: "Đăng sản phẩm lên kênh bán", cap: "W3",
    body: req.salesProductsBody,
    description: `${UC} Sản phẩm thiếu dữ liệu (chưa mở bán, chưa có giá hoặc ảnh) không đẩy lên — trả \`REJECTED\` kèm \`lastError\`. Sai số lượng → 400. ${SALES_NF}`,
    ok: [200, { description: "Tin đăng", schema: res.listingsResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(SALES, { method: "post", path: "/integrations/connections/{id}/sales/unpublish", operationId: "unpublishFromSalesChannel", summary: "Gỡ tin đã đăng", cap: "W3",
    body: req.salesProductsBody, description: `${UC} Ghi nhật ký kiểm toán. ${SALES_NF}`,
    ok: [200, { description: "Đã gỡ", schema: res.unpublishedResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(SALES, { method: "post", path: "/integrations/connections/{id}/sales/availability", operationId: "syncSalesAvailability", summary: "Đẩy còn/hết hàng cho mọi tin đã đăng", cap: "W3",
    description: `${UC} Theo trạng thái mở bán — chưa có số tồn. ${SALES_NF}`, ok: [200, { description: "Số tin đã đẩy", schema: res.availabilityResponse }], errors: [404, 422] }),

  op(GOV, { method: "get", path: "/integrations/governance", operationId: "getIntegrationGovernance", summary: "Chế độ chuỗi đặt cho cửa hàng thành viên theo từng đầu nối", cap: "W4",
    description: `${UC} Kèm tầng trên đã khoá (\`lockedByUpper\`).`, ok: [200, { description: "Chế độ", schema: res.governanceResponse }] }),
  op(GOV, { method: "put", path: "/integrations/governance", operationId: "setIntegrationGovernance", summary: "Đặt chế độ cho một đầu nối", cap: "W4", body: req.governanceBody,
    description: `${UC} Phạm vi là chính tổ chức của phiên. Tổ chức không phải chuỗi/ngành, hoặc tầng trên đã khoá → 422 (\`details.violation\`). Đầu nối lạ → 404.`,
    ok: [200, { description: "Chế độ sau khi đặt", schema: res.governanceResponse }], errors: [...BODY_ERRORS, 404, 422] }),

  op(TOKEN, { method: "get", path: "/integration-tokens", operationId: "listIntegrationTokens", summary: "Token cho engine ngoài (chỉ thông tin, không có giá trị)", cap: "F9",
    ok: [200, { description: "Token", schema: res.tokensResponse }] }),
  op(TOKEN, { method: "post", path: "/integration-tokens", operationId: "issueIntegrationToken", summary: "Cấp token mới", cap: "F9", body: req.issueIntegrationTokenBody,
    description: "Giá trị `token` chỉ có trong chính phản hồi này — CSDL chỉ giữ HMAC; mất là phải xoay lại. `ttl_days` ngoài khoảng cho phép → 400.",
    ok: [201, { description: "Token mới", schema: res.tokenIssuedResponse }], errors: BODY_ERRORS }),
  op(TOKEN, { method: "post", path: "/integration-tokens/{id}/rotate", operationId: "rotateIntegrationToken", summary: "Xoay token — cấp token mới, giữ token cũ", cap: "F9",
    description: "Hai token cùng hiệu lực trong thời gian xoay; thu hồi token cũ bằng `DELETE`. Token mới giữ đúng thời hạn (số ngày) của token đang xoay. Token của tổ chức khác → 404.",
    ok: [201, { description: "Token mới", schema: res.tokenIssuedResponse }], errors: [404] }),
  op(TOKEN, { method: "delete", path: "/integration-tokens/{id}", operationId: "revokeIntegrationToken", summary: "Thu hồi token ngay", cap: "F9",
    description: "Không xoá bản ghi. Token của tổ chức khác → 404.", ok: [200, { description: "Đã thu hồi", schema: res.revokedResponse }], errors: [404] }),
  op(TOKEN, { method: "post", path: "/sso/refresh", operationId: "refreshSsoToken", summary: "Làm mới JWT liên-app cho Unified Shell", cap: null, auth: "session",
    description: "Gọi máy-chủ-tới-máy-chủ từ LocalBudd/SocialFlow, chuyển tiếp cookie phiên. JWT 15 phút: trả trong thân (để app gọi tự đặt cookie cho trình duyệt) và header `Set-Cookie` `alg_sso`.",
    ok: [200, { description: "JWT mới", schema: res.ssoRefreshResponse }] }),
]
