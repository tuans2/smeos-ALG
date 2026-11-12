import type { z } from "zod"

import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-misc"
import * as res from "./responses-misc"

/** Operation `/session/*`, `/reports/*`, `/print/*`, `/vouchers/*`, `/usage/*` (OpenAPI nội bộ, PO 07/11/2026). */
const SESSION = "Phiên — tổ chức & mật khẩu"
const REPORT = "Báo cáo"
const PRINT = "Bản in"
const VOUCHER = "Mã giảm giá"
const USAGE = "Credit & hạn mức"
const NF = "Của tổ chức khác → 404."
const OWN = "Không cần mã năng lực — lời mời của chính người đăng nhập (lọc theo người dùng của phiên); của người khác → 404."
const PERIOD = "`from`/`to` `YYYY-MM-DD` (giờ Việt Nam, mặc định 30 ngày gần nhất), `granularity` `day` · `week` · `month`. Kỳ quá 366 ngày hoặc `from` > `to` → 400; ngày không đúng định dạng hiện bị bỏ qua, dùng kỳ mặc định (audit API §23). Theo đơn tạo trong kỳ và phạm vi chi nhánh của người xem. Mã năng lực kiểm ở use-case."
const PRINT_ERR = "Sai thân → 400 với `details` là bản đồ `đường_dẫn_trường → câu lỗi` (không phải `details.issues`)."
const report = (path: string, operationId: string, summary: string, schema: z.ZodType, extra = "") =>
  op(REPORT, { method: "get", path, operationId, summary, cap: "R20", query: req.reportQuery, description: `${PERIOD}${extra}`, ok: [200, { description: summary, schema }], errors: [400] })

export const MISC_OPERATIONS: OpenApiOperation[] = [
  op(SESSION, { method: "get", path: "/session/invitations", operationId: "listMyInvitations", summary: "Lời mời vào tổ chức khác của tôi", cap: null,
    description: OWN, ok: [200, { description: "Lời mời", schema: res.invitationsResponse }] }),
  op(SESSION, { method: "post", path: "/session/invitations/{id}/accept", operationId: "acceptInvitation", summary: "Nhận lời mời", cap: null,
    description: `${OWN} Không đổi tổ chức đang hoạt động — chuyển bằng \`POST /session/organization\`. Dồn dập → 429.`,
    ok: [200, { description: "Tổ chức vừa vào", schema: res.invitationAcceptedResponse }], errors: [404, 429] }),
  op(SESSION, { method: "post", path: "/session/invitations/{id}/decline", operationId: "declineInvitation", summary: "Từ chối lời mời", cap: null,
    description: `${OWN} Dồn dập → 429.`, ok: [200, { description: "Đã từ chối", schema: res.invitationDeclinedResponse }], errors: [404, 429] }),
  op(SESSION, { method: "post", path: "/session/organization", operationId: "switchOrganization", summary: "Đổi tổ chức đang hoạt động của phiên", cap: null, auth: "session",
    body: req.switchOrganizationBody,
    description: "Chỗ duy nhất client được nêu tên tổ chức; mọi route khác lấy tổ chức từ phiên. Không phải thành viên đang hoạt động của tổ chức đó → 404. Phát lại cookie `alg_sso`.",
    ok: [200, { description: "Tổ chức mới", schema: res.switchOrganizationResponse }], errors: [...BODY_ERRORS, 404] }),
  op(SESSION, { method: "post", path: "/session/password", operationId: "changeOwnPassword", summary: "Tự đổi mật khẩu", cap: "A2", body: req.changePasswordBody,
    description: "Mật khẩu hiện tại sai hoặc mật khẩu mới chưa đủ mạnh → 400. Phiên đang dùng giữ nguyên, các máy khác bị đăng xuất. 10 lần/15 phút/IP → 429.",
    ok: [200, { description: "Đã đổi", schema: res.passwordChangedResponse }], errors: [...BODY_ERRORS, 429] }),

  report("/reports/orders", "getOrderReport", "Đơn theo kỳ: hoàn tất, huỷ, trễ hẹn", res.orderReportResponse),
  report("/reports/revenue", "getRevenueReport", "Doanh thu dự kiến và thực thu", res.revenueReportResponse, " `?detail=orders` thêm danh sách đơn của kỳ (tối đa 200)."),
  report("/reports/products", "getProductReport", "Xếp hạng mẫu, tỷ trọng màu và phong cách", res.productReportResponse),
  report("/reports/performance", "getPerformanceReport", "Doanh số Sale, sản lượng thợ, giao đúng giờ", res.performanceReportResponse),
  report("/reports/cashflow", "getCashflowReport", "Dòng tiền theo hình thức thu, đối chiếu ngân hàng", res.cashflowReportResponse),

  op(USAGE, { method: "get", path: "/usage", operationId: "listUsage", summary: "Lịch sử dùng credit", cap: "G8", query: req.usageListQuery,
    description: "Phân trang con trỏ; `limit` không phải số nguyên hoặc ngoài khoảng cho phép → 400.", ok: [200, { description: "Trang lịch sử", schema: res.usageListResponse }], errors: [400] }),
  op(USAGE, { method: "get", path: "/usage/summary", operationId: "getUsageSummary", summary: "Tổng hợp credit theo tính năng", cap: "G8", query: req.usageSummaryQuery,
    description: "`?period=YYYY-MM` lọc theo tháng, kèm hạn mức và gói. Thân không bọc `{ data }`.", ok: [200, { description: "Tổng hợp", schema: res.usageSummaryResponse }], errors: [400] }),
  op(USAGE, { method: "get", path: "/usage/limits", operationId: "getUsageLimits", summary: "Hạn mức credit tháng", cap: "G8",
    description: "Mã năng lực kiểm ở use-case.", ok: [200, { description: "Hạn mức", schema: res.usageLimitsResponse }] }),
  op(USAGE, { method: "put", path: "/usage/limits", operationId: "setAiMonthlyLimit", summary: "Đặt hạn mức credit AI mỗi tháng", cap: "U2", body: req.aiMonthlyLimitBody,
    description: "Mã năng lực kiểm ở use-case. `null` = bỏ hạn mức. Chặn ngay khi trừ credit: vượt → 422 `QUOTA_EXCEEDED`.", ok: [200, { description: "Hạn mức", schema: res.usageLimitsResponse }], errors: BODY_ERRORS }),

  op(VOUCHER, { method: "get", path: "/vouchers/batches", operationId: "listVoucherBatches", summary: "Đợt phát hành mã giảm giá", cap: "Q8",
    description: "Kèm ưu đãi đang bật và trần % (cùng nguồn ma trận ưu đãi). Thân không bọc `{ data }`.", ok: [200, { description: "Đợt", schema: res.voucherBatchesResponse }] }),
  op(VOUCHER, { method: "post", path: "/vouchers/batches", operationId: "issueVoucherBatch", summary: "Phát hành đợt mã mới", cap: "Q8", body: req.createVoucherBatchBody,
    description: "`SHARED`: một mã dùng chung; `UNIQUE`: `quantity` mã riêng theo `code_prefix`. Tên 2–120 ký tự; mức giảm vượt trần % của ma trận ưu đãi, mã dùng chung đã có, hoặc hết hạn trước ngày bắt đầu → 400 (`details` theo trường). Thân không bọc `{ data }`.",
    ok: [201, { description: "Đợt mới", schema: res.voucherBatchCreatedResponse }], errors: BODY_ERRORS }),
  op(VOUCHER, { method: "get", path: "/vouchers/batches/{id}", operationId: "getVoucherBatch", summary: "Một đợt kèm danh sách mã", cap: "Q8", description: NF,
    ok: [200, { description: "Đợt và mã", schema: res.voucherBatchResponse }], errors: [404] }),
  op(VOUCHER, { method: "patch", path: "/vouchers/batches/{id}", operationId: "toggleVoucherBatch", summary: "Tạm dừng / mở lại cả đợt", cap: "Q8", body: req.voucherBatchActiveBody,
    description: NF, ok: [200, { description: "Đã đổi", schema: res.voucherBatchToggledResponse }], errors: [...BODY_ERRORS, 404] }),
  op(VOUCHER, { method: "get", path: "/vouchers/batches/{id}/export", operationId: "exportVoucherCodes", summary: "Tải danh sách mã (CSV)", cap: "Q8",
    description: `Ghi nhật ký xuất dữ liệu. ${NF}`, ok: [200, { description: "Tệp CSV", contentType: "text/csv" }], errors: [404] }),

  op(PRINT, { method: "post", path: "/print/preflight", operationId: "preflightPrint", summary: "Kiểm trước khi in (kích thước, DPI, vùng an toàn, QR)", cap: "`M5` hoặc `Q1`",
    body: req.preflightBody, description: `Không lưu. ${PRINT_ERR}`, ok: [200, { description: "Kết quả kiểm", schema: res.preflightResponse }], errors: BODY_ERRORS }),
  op(PRINT, { method: "get", path: "/print/renditions", operationId: "listPrintRenditions", summary: "Bản in đã tạo", cap: "`M5` hoặc `Q1`", query: req.renditionsQuery,
    description: "Phân trang `limit` (1–100, mặc định 50) + `offset`; sai → 400.", ok: [200, { description: "Bản in", schema: res.renditionsResponse }], errors: [400] }),
  op(PRINT, { method: "post", path: "/print/renditions", operationId: "createPrintRendition", summary: "Tạo bản in theo khổ chuẩn", cap: "M5", body: req.createPrintRenditionSchema,
    description: `Lưu kèm kết quả kiểm trước khi in. ${PRINT_ERR}`, ok: [201, { description: "Bản in", schema: res.renditionResponse }], errors: BODY_ERRORS }),
  op(PRINT, { method: "get", path: "/print/renditions/{id}", operationId: "getPrintRendition", summary: "Một bản in", cap: "`M5` hoặc `Q1`", description: NF,
    ok: [200, { description: "Bản in", schema: res.renditionResponse }], errors: [404] }),
  op(PRINT, { method: "post", path: "/print/renditions/{id}/export", operationId: "exportPrintPdf", summary: "Xuất PDF in (kèm dấu cắt)", cap: "M5", body: req.printExportBody,
    description: `Ảnh gửi kèm (data URL, ≤ 20 MB) kiểm nội dung ở use-case. PDF trả trong thân, ghi nhật ký xuất dữ liệu. ${PRINT_ERR} ${NF}`,
    ok: [200, { description: "PDF", schema: res.renditionExportResponse }], errors: [...BODY_ERRORS, 404] }),
]
