import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-admin"
import * as res from "./responses-admin"

/** Operation nhóm quản trị & AI (OpenAPI nội bộ, PO 07/11/2026). */
const ORG = "Vai trò & không gian làm việc"
const LOG = "Nhật ký kiểm toán"
const SUB = "Gói thuê bao"
const AI = "Quản trị AI"
const NF = "Của tổ chức khác → 404."

export const ADMIN_OPERATIONS: OpenApiOperation[] = [
  op(ORG, { method: "get", path: "/roles", operationId: "listRoles", summary: "Vai trò và mã năng lực đang hiệu lực", cap: "F1",
    description: "Gồm vai hệ thống dùng chung và vai riêng của tổ chức; `next_cursor` luôn `null`.", ok: [200, { description: "Vai trò", schema: res.rolesResponse }] }),
  op(ORG, { method: "post", path: "/roles", operationId: "createRole", summary: "Tạo vai riêng", cap: "F5", body: req.createRoleBody,
    description: "`key` sinh từ tên; trùng tên → thêm hậu tố (`kho-2`), không báo lỗi.", ok: [201, { description: "Vai trò", schema: res.roleCreatedResponse }], errors: BODY_ERRORS }),
  op(ORG, { method: "patch", path: "/roles/{id}/capabilities", operationId: "updateRoleCapabilities", summary: "Bật/tắt mã năng lực cho một vai", cap: "F5", body: req.updateRoleCapabilitiesBody,
    description: `Ghi \`capability_overrides\`, kể cả vai hệ thống (chỉ trong tổ chức này). Mã lạ → 400. Bật mã bị trần cứng chặn → 403 \`CAPABILITY_DENIED\` và không ghi gì. Không chặn việc tự bỏ \`F5\` khỏi vai của chính mình (audit API §29). Trả mã hiệu lực sau khi áp. ${NF}`,
    ok: [200, { description: "Mã năng lực", schema: res.roleCapabilitiesResponse }], errors: [...BODY_ERRORS, 404] }),
  op(ORG, { method: "get", path: "/workspaces", operationId: "listWorkspaces", summary: "Không gian làm việc của tổ chức", cap: "F1",
    description: "`next_cursor` luôn `null`.", ok: [200, { description: "Không gian", schema: res.workspacesResponse }] }),
  op(ORG, { method: "post", path: "/workspaces", operationId: "createWorkspace", summary: "Tạo không gian trải nghiệm hoặc sản xuất", cap: "F8", body: req.createWorkspaceBody,
    ok: [201, { description: "Không gian", schema: res.workspaceCreatedResponse }], errors: BODY_ERRORS }),
  op(ORG, { method: "get", path: "/ux-rollout-flags", operationId: "getUxRolloutFlags", summary: "Cờ thử giao diện đang bật cho tổ chức", cap: null, auth: "session",
    description: "Chỉ cần phiên của tổ chức. Không trả danh sách tổ chức khác.", ok: [200, { description: "Cờ", schema: res.uxFlagsResponse }] }),

  op(LOG, { method: "get", path: "/audit-logs", operationId: "listAuditLogs", summary: "Nhật ký kiểm toán của tổ chức", cap: "G9", query: req.auditLogsQuery,
    description: "`limit` 1–100, sai → 400; `action` khớp đầu mã; `from`/`to` `YYYY-MM-DD` giờ Việt Nam, tính cả hai đầu, sai dạng → 400. Phân trang con trỏ. Thân không bọc thêm.",
    ok: [200, { description: "Nhật ký", schema: res.auditLogsResponse }], errors: [400] }),
  op(LOG, { method: "get", path: "/audit-logs/platform-access", operationId: "listPlatformAccessLogs", summary: "Nhân viên nền tảng đã truy cập dữ liệu của tổ chức", cap: "G9", query: req.platformAccessQuery,
    description: "Thời điểm, người, mục đích. Phân trang con trỏ; `limit` sai → 400.", ok: [200, { description: "Lượt truy cập", schema: res.platformAccessResponse }], errors: [400] }),

  op(SUB, { method: "get", path: "/subscription", operationId: "getMySubscription", summary: "Gói thuê bao và hoá đơn của cửa hàng", cap: "D1",
    description: "Mã năng lực kiểm ở use-case. Chưa gán gói → `subscription: null`. Hoá đơn chờ trả kèm mã VietQR (nội dung chuyển khoản = mã hoá đơn `TB…`).", ok: [200, { description: "Gói", schema: res.subscriptionResponse }] }),
  op(SUB, { method: "post", path: "/billing/sepay", operationId: "receivePlatformSepayWebhook", summary: "SePay báo tiền vào tài khoản thuê bao của nền tảng", cap: null, auth: "public", body: req.sepayPlatformWebhookBody,
    description: "Không dùng phiên: xác thực bằng `Authorization: Apikey <khoá>`. Nền tảng chưa cấu hình khoá → 404; sai khoá → 401. Thân sai → 400 `details.body`. 600 lần/phút → 429. Khớp nội dung chuyển khoản với mã hoá đơn.",
    ok: [200, { description: "Đã nhận", schema: res.sepayWebhookResponse }], errors: [400, 401, 404, 429] }),

  op(AI, { method: "get", path: "/ai-policy", operationId: "getAiPolicy", summary: "Năng lực AI, trần mô hình, mức quyền riêng tư", cap: "U1", ok: [200, { description: "Chính sách", schema: res.aiPolicyResponse }] }),
  op(AI, { method: "put", path: "/ai-policy", operationId: "putAiPolicy", summary: "Đặt trần cho một năng lực AI", cap: "U2", body: req.putAiPolicyBody,
    description: "Năng lực lạ, mô hình không đủ điều kiện hoặc hạ sàn quyền riêng tư dưới mức của năng lực → 400. Đổi `AIC-01` cần thêm `H4` (kiểm ở use-case). Ghi nhật ký kiểm toán; trả toàn bộ chính sách.",
    ok: [200, { description: "Chính sách", schema: res.aiPolicyResponse }], errors: BODY_ERRORS }),
  op(AI, { method: "get", path: "/ai-capabilities", operationId: "listAiCapabilities", summary: "Danh mục năng lực kèm trạng thái đo lường của từng mô hình", cap: "U1", ok: [200, { description: "Danh mục", schema: res.aiCapabilitiesResponse }] }),
  op(AI, { method: "get", path: "/ai-requests", operationId: "listAiRequests", summary: "Sổ chi phí và chất lượng từng lời gọi AI", cap: "U3", query: req.aiRequestsQuery,
    description: "Lọc theo năng lực và khoảng thời gian; `from`/`to`/`limit` sai bị bỏ qua (không 400). Tối đa 5.000 dòng. Không có prompt hay đầu ra.", ok: [200, { description: "Lời gọi", schema: res.aiRequestsResponse }] }),
  op(AI, { method: "get", path: "/ai-requests/summary", operationId: "summarizeAiRequests", summary: "Tổng hợp theo năng lực và mô hình", cap: "U3", query: req.aiRequestsQuery,
    description: "Chi phí, độ trễ, điểm, tỷ lệ phải leo thác. Cùng bộ lọc với `/ai-requests`.", ok: [200, { description: "Tổng hợp", schema: res.aiSummaryResponse }] }),
  op(AI, { method: "get", path: "/ai-requests/review", operationId: "listAiReviewQueue", summary: "Hàng chờ soát đầu ra AI", cap: "U3", query: req.reviewQueueQuery,
    description: "Lời gọi `NEEDS_REVIEW`/`ESCALATED`, mặc định 100, tối đa 5.000. `limit` không phải số → 500 (audit API §29).", ok: [200, { description: "Hàng chờ", schema: res.reviewQueueResponse }] }),
  op(AI, { method: "post", path: "/ai-requests/review", operationId: "reviewAiRequest", summary: "Duyệt / từ chối / sửa một đầu ra AI", cap: "U3", body: req.reviewAiRequestBody,
    description: `Ghi nhật ký kiểm toán. ${NF}`, ok: [200, { description: "Quyết định", schema: res.reviewDecisionResponse }], errors: [...BODY_ERRORS, 404] }),
  op(AI, { method: "post", path: "/content-guard/validate", operationId: "validateFlowerContent", summary: "Kiểm văn bản với từ điển từ cấm ngành hoa và phong cách cấm của thương hiệu", cap: null, auth: "session",
    body: req.validateContentBody, description: "Chỉ cần phiên của tổ chức. `autoSanitize: true` → kèm `sanitizedText` (thay bằng gợi ý). Văn bản rỗng → 400.",
    ok: [200, { description: "Kết quả kiểm", schema: res.contentGuardResponse }], errors: BODY_ERRORS }),
]
