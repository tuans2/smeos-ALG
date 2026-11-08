import type { OpenApiOperation, OpenApiResponse } from "@/core/http/openapi"

/**
 * Khuôn operation của OpenAPI nội bộ (API tiệm gọi từ giao diện SMEOS, PO 07/11/2026). Mọi route cần phiên đăng
 * nhập của thành viên tổ chức; `organization_id` lấy từ phiên, không nhận từ thân/query. Chung cho mọi route
 * (`requireTenantContext`): thiếu phiên → 401; thiếu mã năng lực, công cụ bị khoá hoặc đang dùng mật khẩu tạm → 403;
 * phiên chưa chọn tổ chức → 409; lệnh ghi khi gói quá hạn → 402. Bản ghi của tổ chức khác → 404 (không bao giờ 403).
 */
export type Op = Omit<OpenApiOperation, "tags" | "responses" | "security" | "errors" | "extensions"> & {
  ok: [number, OpenApiResponse]
  /** Mã năng lực (`R1`, "`R15` hoặc `Q1`"…); `null` = chỉ cần phiên. */
  cap: string | null
  errors?: number[]
}
export const op = (tag: string, o: Op): OpenApiOperation => {
  const { ok, cap, errors = [], ...rest } = o
  const base = o.method === "get" ? [401, 403, 409] : [401, 402, 403, 409]
  return {
    ...rest,
    tags: [tag],
    security: ["tenantSession"],
    responses: { [ok[0]]: ok[1] },
    errors: [...new Set([...base, ...errors])].sort((a, b) => a - b),
    extensions: { "x-capability": cap ?? "phiên thành viên" },
  }
}
export const BODY_ERRORS = [400, 413]
