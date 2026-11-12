import type { OpenApiOperation, OpenApiResponse } from "@/core/http/openapi"

import * as req from "./requests"
import * as res from "./responses-orgs"

/**
 * Operation Console Vận hành Nền tảng — tổ chức, thu phí, credit, vận hành (OpenAPI `/platform/*`, PO 07/11/2026).
 * Mọi route cần phiên của người vận hành (`platform_operators`); mã `N*` kiểm ở route hoặc use-case. Route đọc/ghi
 * dữ liệu một tổ chức ghi nhật ký truy cập nền tảng trước (D-60).
 */
export type Op = Omit<OpenApiOperation, "tags" | "responses" | "security" | "errors" | "extensions"> & {
  ok: [number, OpenApiResponse]
  /** Mã năng lực nền tảng; `null` = chỉ cần phiên người vận hành. */
  cap: string | null
  errors?: number[]
}
export const op = (tag: string, o: Op): OpenApiOperation => {
  const { ok, cap, errors = [], ...rest } = o
  // Không phiên → 401; phiên không phải người vận hành hoặc thiếu mã N → 403
  const base = [401, 403]
  return {
    ...rest,
    tags: [tag],
    security: ["platformSession"],
    responses: { [ok[0]]: ok[1] },
    errors: [...new Set([...base, ...errors])].sort((a, b) => a - b),
    extensions: { "x-capability": cap ?? "phiên người vận hành" },
  }
}
const ORGS = "Nền tảng — tổ chức"
const BILLING = "Nền tảng — thu phí & credit"
const OPS = "Nền tảng — vận hành"
const D60 = " Ghi nhật ký truy cập nền tảng trước khi đọc/ghi (D-60)."
const BODY_ERRORS = [400, 413]

export const ORG_OPERATIONS: OpenApiOperation[] = [
  op(ORGS, { method: "get", path: "/platform/organizations", operationId: "platformListOrganizations", summary: "Danh sách tổ chức", cap: "N1",
    ok: [200, { description: "Tổ chức kèm số dư credit, số thành viên", schema: res.organizationsResponse }] }),
  op(ORGS, { method: "post", path: "/platform/organizations", operationId: "platformCreateOrganization", summary: "Tạo tổ chức với tài khoản chủ tiệm mật khẩu tạm",
    description: "Gán gói thuê bao (`subscription`) cần thêm `N19`. Mật khẩu tạm trả đúng một lần.", cap: "N7", body: req.createOrganizationBody,
    ok: [201, { description: "Đã tạo", schema: res.createOrganizationResponse }], errors: [...BODY_ERRORS, 409, 422] }),
  op(ORGS, { method: "get", path: "/platform/organizations/{id}", operationId: "platformGetOrganization", summary: "Chi tiết một tổ chức", description: `Kèm yêu cầu đang chờ duyệt.${D60}`, cap: "N1",
    ok: [200, { description: "Tổ chức", schema: res.organizationResponse }], errors: [404] }),
  op(ORGS, { method: "patch", path: "/platform/organizations/{id}", operationId: "platformUpdateOrganization", summary: "Duyệt/từ chối yêu cầu của tổ chức",
    description: `Đổi mô hình, mở khoá ngôn ngữ, gỡ yêu cầu chờ, duyệt hạn mức chat công khai, bật phạm vi chi nhánh đợt 1, vòng đời (\`lifecycle_status\`), mức cô lập (\`isolation_tier\` — gói không cho phép → 422) — trả kết quả của thao tác cuối trong thân. Mã năng lực kiểm ở use-case (\`N2\`).${D60}`,
    cap: "N2", body: req.organizationPatchBody, ok: [200, { description: "Kết quả", schema: res.organizationPatchResponse }], errors: [...BODY_ERRORS, 404, 409, 422] }),
  op(ORGS, { method: "get", path: "/platform/pending-approvals", operationId: "platformPendingApprovals", summary: "Yêu cầu chờ duyệt (ngôn ngữ, mô hình, hạn mức chat)", cap: "N1",
    ok: [200, { description: "Hàng chờ", schema: res.pendingApprovalsResponse }] }),
  op(ORGS, { method: "get", path: "/platform/registrations", operationId: "platformListRegistrations", summary: "Tài khoản tự đăng ký chờ duyệt", cap: "N13",
    ok: [200, { description: "Hàng chờ", schema: res.registrationsResponse }] }),
  op(ORGS, { method: "post", path: "/platform/registrations/{userId}/decision", operationId: "platformDecideRegistration", summary: "Duyệt hoặc từ chối tài khoản tự đăng ký",
    description: "Duyệt tài khoản dùng thử trả `temporaryPassword` đúng một lần (không lưu, không ghi nhật ký).", cap: "N13", body: req.registrationDecisionBody,
    ok: [200, { description: "Đã quyết định", schema: res.registrationDecisionResponse }], errors: [...BODY_ERRORS, 404, 409] }),
  op(ORGS, { method: "post", path: "/platform/tier-preview", operationId: "platformStartTierPreview", summary: "Xem trước giao diện theo tầng/vai",
    description: "Đặt cookie xem trước — chỉ đổi khuôn trải nghiệm, không đổi tổ chức hay quyền.", cap: "N1", body: req.tierPreviewBody,
    ok: [200, { description: "Đang xem trước", schema: res.tierPreviewResponse }], errors: BODY_ERRORS }),
  op(ORGS, { method: "delete", path: "/platform/tier-preview", operationId: "platformStopTierPreview", summary: "Về vai thật", cap: null,
    ok: [200, { description: "Đã gỡ cookie xem trước", schema: res.clearTierPreviewResponse }] }),

  op(BILLING, { method: "get", path: "/platform/organizations/{id}/credits", operationId: "platformGetCredits", summary: "Sổ cái credit của tổ chức", description: `Số dư, các dòng gần nhất, mức dùng tháng.${D60}`, cap: "N1",
    ok: [200, { description: "Sổ cái", schema: res.creditsResponse }], errors: [404] }),
  op(BILLING, { method: "post", path: "/platform/organizations/{id}/credits", operationId: "platformAdjustCredits", summary: "Nạp/tặng/hoàn credit", description: D60.trim(), cap: "N3", body: req.adjustCreditsBody,
    ok: [200, { description: "Số dư mới", schema: res.adjustCreditsResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(BILLING, { method: "put", path: "/platform/organizations/{id}/usage-limit", operationId: "platformSetUsageLimit", summary: "Hạn mức credit/tháng của tổ chức (`null` = không giới hạn)", description: D60.trim(), cap: "N3",
    body: req.usageLimitBody, ok: [200, { description: "Mức dùng tháng", schema: res.usageLimitResponse }], errors: [...BODY_ERRORS, 404] }),
  op(BILLING, { method: "get", path: "/platform/organizations/{id}/subscription", operationId: "platformGetSubscription", summary: "Gói thuê bao và hoá đơn của tổ chức", description: D60.trim(), cap: "N1",
    ok: [200, { description: "Gói và hoá đơn", schema: res.subscriptionResponse }], errors: [404] }),
  op(BILLING, { method: "put", path: "/platform/organizations/{id}/subscription", operationId: "platformAssignSubscription", summary: "Gán/đổi gói thuê bao", description: D60.trim(), cap: "N19",
    body: req.assignSubscriptionBody, ok: [200, { description: "Gói hiện hành", schema: res.assignSubscriptionResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(BILLING, { method: "delete", path: "/platform/organizations/{id}/subscription", operationId: "platformCancelSubscription", summary: "Huỷ gói thuê bao", description: D60.trim(), cap: "N19",
    ok: [200, { description: "Đã huỷ", schema: res.cancelSubscriptionResponse }], errors: [404] }),
  op(BILLING, { method: "post", path: "/platform/subscription-invoices/{id}/mark-paid", operationId: "platformMarkInvoicePaid", summary: "Xác nhận đã thu hoá đơn thuê bao", cap: "N19",
    body: req.markInvoicePaidBody, ok: [200, { description: "Đã ghi nhận", schema: res.markInvoicePaidResponse }], errors: [...BODY_ERRORS, 404, 409] }),
  op(BILLING, { method: "get", path: "/platform/billing-account", operationId: "platformGetBillingAccount", summary: "Tài khoản nhận tiền thuê bao của nền tảng", cap: "N1",
    ok: [200, { description: "Tài khoản, hoặc `null` khi chưa đặt", schema: res.billingAccountResponse }] }),
  op(BILLING, { method: "put", path: "/platform/billing-account", operationId: "platformSetBillingAccount", summary: "Đặt tài khoản nhận tiền thuê bao", cap: "N19",
    body: req.billingAccountBody, ok: [200, { description: "Đã lưu", schema: res.setBillingAccountResponse }], errors: BODY_ERRORS }),
  op(BILLING, { method: "get", path: "/platform/credit-pricing", operationId: "platformGetCreditPricing", summary: "Quy đổi credit cấp nền tảng", cap: "N4",
    ok: [200, { description: "Bảng quy đổi", schema: res.creditPricingResponse }] }),
  op(BILLING, { method: "put", path: "/platform/credit-pricing", operationId: "platformUpdateCreditPricing", summary: "Sửa quy đổi credit", cap: "N3",
    body: req.creditPricingBody, ok: [200, { description: "Bảng quy đổi mới", schema: res.creditPricingResponse }], errors: [...BODY_ERRORS, 422] }),
  op(BILLING, { method: "get", path: "/platform/margin", operationId: "platformMargin", summary: "Biên lợi nhuận nền tảng theo tháng và tổ chức", cap: "N4", query: req.marginQuery,
    ok: [200, { description: "Doanh thu, chi phí AI/tin nhắn, biên", schema: res.marginResponse }], errors: [400] }),
  op(BILLING, { method: "get", path: "/platform/usage", operationId: "platformUsage", summary: "Mức dùng và credit gộp toàn hệ thống", cap: "N4", query: req.usageQuery,
    ok: [200, { description: "Theo tổ chức × tính năng", schema: res.usageResponse }] }),
  op(BILLING, { method: "get", path: "/platform/organizations/{id}/custom-domains", operationId: "platformListCustomDomains", summary: "Tên miền riêng của tổ chức", description: D60.trim(), cap: "N1",
    ok: [200, { description: "Tên miền", schema: res.customDomainsResponse }], errors: [404] }),
  op(BILLING, { method: "post", path: "/platform/custom-domains/{id}/lock", operationId: "platformLockCustomDomain", summary: "Khoá/mở khoá tên miền riêng",
    description: "`locked: true` ngừng phục vụ ngay; `false` về \"Chờ xác minh\".", cap: "N20", body: req.customDomainLockBody,
    ok: [200, { description: "Tên miền", schema: res.customDomainLockResponse }], errors: [...BODY_ERRORS, 404] }),

  op(OPS, { method: "get", path: "/platform/overview", operationId: "platformOverview", summary: "Tổng quan Console", description: "Phần sức khoẻ hệ thống cần `N5` — thiếu thì `health: null`.", cap: "N1",
    ok: [200, { description: "Tổ chức, doanh thu thuê bao, sức khoẻ", schema: res.overviewResponse }] }),
  op(OPS, { method: "get", path: "/platform/health", operationId: "platformHealth", summary: "Sức khoẻ hàng đợi và worker (chỉ đọc)", cap: "N5",
    ok: [200, { description: "Trạng thái", schema: res.healthResponse }] }),
  op(OPS, { method: "get", path: "/platform/jobs/failed", operationId: "platformFailedJobs", summary: "Hàng đợi job lỗi xuyên tổ chức", description: "Không trả payload/output của job.", cap: "N5",
    ok: [200, { description: "Job lỗi", schema: res.failedJobsResponse }] }),
  op(OPS, { method: "post", path: "/platform/jobs/{id}/action", operationId: "platformActOnFailedJob", summary: "Chạy lại hoặc gác lại một job lỗi",
    description: "Job không còn `FAILED` → 404.", cap: "N15", body: req.failedJobActionBody,
    ok: [200, { description: "Trạng thái mới", schema: res.failedJobActionResponse }], errors: [...BODY_ERRORS, 404] }),
  op(OPS, { method: "get", path: "/platform/audit-logs", operationId: "platformAuditLogs", summary: "Nhật ký kiểm toán hợp nhất (tổ chức + nền tảng)", cap: "N6", query: req.auditLogsQuery,
    ok: [200, { description: "Dòng nhật ký mới nhất trước", schema: res.auditLogsResponse }] }),
]
