import { buildOpenApiDocument, type OpenApiOperation } from "@/core/http/openapi"

import { AI_STUDIO_OPERATIONS } from "./ops-ai-studio"
import { BRAND_OPERATIONS } from "./ops-brand"
import { CHAIN_OPERATIONS } from "./ops-chain"
import { CHAT_OPERATIONS } from "./ops-chat"
import { COORDINATOR_OPERATIONS } from "./ops-coordinator"
import { COSTING_OPERATIONS } from "./ops-costing"
import { CREATIVE_OPERATIONS } from "./ops-creative"
import { CRM_OPERATIONS } from "./ops-crm"
import { GREETING_OPERATIONS } from "./ops-greeting"
import { GREETING_ORDER_OPERATIONS } from "./ops-greeting-orders"
import { INTEGRATION_HUB_OPERATIONS } from "./ops-integrations"
import { MEDIA_OPERATIONS } from "./ops-media"
import { NOTIFICATION_OPERATIONS } from "./ops-notification"
import { ORDER_OPERATIONS } from "./ops-orders"
import { ORG_OPERATIONS } from "./ops-org"
import { PRODUCT_OPERATIONS } from "./ops-products"
import { STORAGE_OPERATIONS } from "./ops-storage"

/**
 * OpenAPI 3.1 nội bộ của API tiệm `/api/v1/*` — chỉ giao diện SMEOS gọi (PO 07/11/2026). Tệp sinh ra:
 * `docs/spec/contracts/openapi/internal.openapi.json` (`npm run gen:openapi`) — không sửa tay, không công bố ra
 * ngoài. Phủ dần theo đợt; `INTERNAL_COVERED_PREFIXES` liệt kê nhóm đã phủ — mọi route trong nhóm đó phải có
 * operation (`tests/unit/architecture/internal-openapi.test.ts`), danh sách chỉ được dài thêm.
 */
export const INTERNAL_OPENAPI_PATH = "docs/spec/contracts/openapi/internal.openapi.json"

export const INTERNAL_COVERED_PREFIXES = ["orders", "quotations", "products", "crm", "members", "organizations", "organization", "auth", "greeting-card", "coordinator", "creative-production", "media", "jobs", "vision", "audio", "video", "notification", "chat", "internal-chat", "branches", "branch-portal", "chain", "costing", "pricing-rules", "price-lists", "integrations", "integration-tokens", "sso", "assets", "asset-usages", "storage", "brand-kit", "brand-library", "product-copies"] as const

export const INTERNAL_OPERATIONS: OpenApiOperation[] = [...ORDER_OPERATIONS, ...PRODUCT_OPERATIONS, ...CRM_OPERATIONS, ...ORG_OPERATIONS, ...GREETING_ORDER_OPERATIONS, ...GREETING_OPERATIONS, ...COORDINATOR_OPERATIONS, ...CREATIVE_OPERATIONS, ...MEDIA_OPERATIONS, ...AI_STUDIO_OPERATIONS, ...NOTIFICATION_OPERATIONS, ...CHAT_OPERATIONS, ...CHAIN_OPERATIONS, ...COSTING_OPERATIONS, ...INTEGRATION_HUB_OPERATIONS, ...STORAGE_OPERATIONS, ...BRAND_OPERATIONS]

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
