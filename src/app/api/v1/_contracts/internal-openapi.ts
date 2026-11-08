import { buildOpenApiDocument, type OpenApiOperation } from "@/core/http/openapi"

import { COORDINATOR_OPERATIONS } from "./ops-coordinator"
import { CRM_OPERATIONS } from "./ops-crm"
import { GREETING_OPERATIONS } from "./ops-greeting"
import { GREETING_ORDER_OPERATIONS } from "./ops-greeting-orders"
import { ORDER_OPERATIONS } from "./ops-orders"
import { ORG_OPERATIONS } from "./ops-org"
import { PRODUCT_OPERATIONS } from "./ops-products"

/**
 * OpenAPI 3.1 nội bộ của API tiệm `/api/v1/*` — chỉ giao diện SMEOS gọi (PO 07/11/2026). Tệp sinh ra:
 * `docs/spec/contracts/openapi/internal.openapi.json` (`npm run gen:openapi`) — không sửa tay, không công bố ra
 * ngoài. Phủ dần theo đợt; `INTERNAL_COVERED_PREFIXES` liệt kê nhóm đã phủ — mọi route trong nhóm đó phải có
 * operation (`tests/unit/architecture/internal-openapi.test.ts`), danh sách chỉ được dài thêm.
 */
export const INTERNAL_OPENAPI_PATH = "docs/spec/contracts/openapi/internal.openapi.json"

export const INTERNAL_COVERED_PREFIXES = ["orders", "quotations", "products", "crm", "members", "organizations", "organization", "auth", "greeting-card", "coordinator"] as const

export const INTERNAL_OPERATIONS: OpenApiOperation[] = [...ORDER_OPERATIONS, ...PRODUCT_OPERATIONS, ...CRM_OPERATIONS, ...ORG_OPERATIONS, ...GREETING_ORDER_OPERATIONS, ...GREETING_OPERATIONS, ...COORDINATOR_OPERATIONS]

export function buildInternalOpenApi(): Record<string, unknown> {
  return buildOpenApiDocument({
    title: "SMEOS Internal API",
    version: "1.0.0",
    description: [
      "API nội bộ của ứng dụng tiệm — chỉ giao diện SMEOS gọi, không phải API công khai (xem Integration API).",
      "Mọi route cần phiên đăng nhập của thành viên tổ chức; `organization_id` lấy từ phiên, không nhận từ thân/query.",
      "Quyền theo mã năng lực (`x-capability`), không theo tên vai. Bản ghi của tổ chức khác trả 404, không bao giờ 403.",
      "Lỗi chung: thiếu phiên 401; thiếu quyền, công cụ bị khoá, đang dùng mật khẩu tạm 403; phiên chưa chọn tổ chức 409;",
      "lệnh ghi khi gói quá hạn 402.",
    ].join(" "),
    serverUrl: "/api/v1",
    securitySchemes: {
      tenantSession: { type: "apiKey", in: "cookie", name: "smeos_session", description: "Phiên đăng nhập của thành viên tổ chức" },
      platformSession: { type: "apiKey", in: "cookie", name: "smeos_session", description: "Phiên của người vận hành nền tảng (vài route cấu hình hộ tổ chức)" },
    },
    operations: INTERNAL_OPERATIONS,
  })
}
