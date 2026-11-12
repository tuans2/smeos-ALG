import { buildOpenApiDocument, type OpenApiOperation } from "@/core/http/openapi"
import { isKnownApiRoute } from "@/lib/delivery/delivery-phase"

import { AI_STUDIO_OPERATIONS } from "./ops-ai-studio"
import { BRAND_OPERATIONS } from "./ops-brand"
import { CHAIN_OPERATIONS } from "./ops-chain"
import { CHAT_OPERATIONS } from "./ops-chat"
import { CONTENT_OPERATIONS } from "./ops-content"
import { COORDINATOR_OPERATIONS } from "./ops-coordinator"
import { COSTING_OPERATIONS } from "./ops-costing"
import { CREATIVE_OPERATIONS } from "./ops-creative"
import { CRM_OPERATIONS } from "./ops-crm"
import { GREETING_OPERATIONS } from "./ops-greeting"
import { GREETING_ORDER_OPERATIONS } from "./ops-greeting-orders"
import { INTEGRATION_HUB_OPERATIONS } from "./ops-integrations"
import { MEDIA_OPERATIONS } from "./ops-media"
import { MISC_OPERATIONS } from "./ops-misc"
import { NOTIFICATION_OPERATIONS } from "./ops-notification"
import { ORDER_OPERATIONS } from "./ops-orders"
import { ORG_OPERATIONS } from "./ops-org"
import { PRODUCT_OPERATIONS } from "./ops-products"
import { PROFILE_OPERATIONS } from "./ops-profile"
import { MARKETING_OPERATIONS } from "./ops-marketing"
import { PRODUCT_EXTRA_OPERATIONS } from "./ops-product-extra"
import { ADMIN_OPERATIONS } from "./ops-admin"
import { TOOLS_OPERATIONS } from "./ops-tools"
import { FINAL_OPERATIONS } from "./ops-final"
import { STUDIO_OPERATIONS } from "./ops-studio"
import { STORAGE_OPERATIONS } from "./ops-storage"

/**
 * OpenAPI 3.1 nội bộ của API tiệm `/api/v1/*` — chỉ giao diện ALG gọi (PO 07/11/2026). Tệp sinh ra:
 * `docs/spec/contracts/openapi/internal.openapi.json` (`npm run gen:openapi`) — không sửa tay, không công bố ra
 * ngoài. Phủ dần theo đợt; `INTERNAL_COVERED_PREFIXES` liệt kê nhóm đã phủ — mọi route trong nhóm đó phải có
 * operation (`tests/unit/architecture/internal-openapi.test.ts`), danh sách chỉ được dài thêm.
 */
export const INTERNAL_OPENAPI_PATH = "docs/spec/contracts/openapi/internal.openapi.json"

export const INTERNAL_COVERED_PREFIXES = ["orders", "quotations", "products", "crm", "members", "organizations", "organization", "auth", "greeting-card", "coordinator", "creative-production", "media", "jobs", "vision", "audio", "video", "notification", "chat", "internal-chat", "branches", "branch-portal", "chain", "costing", "pricing-rules", "price-lists", "integrations", "integration-tokens", "sso", "assets", "asset-usages", "storage", "brand-kit", "brand-library", "product-copies", "content-engine", "market-intelligence", "session", "reports", "print", "vouchers", "usage", "business-profile", "brand-profile", "store", "store-share-link", "shop-reviews", "custom-domains", "short-links", "leads", "campaigns", "marketing-center", "customer-segments", "customers", "customer-interactions", "occasions", "delivery", "product-photo", "product-image-set", "product-change-requests", "availability", "roles", "workspaces", "ux-rollout-flags", "audit-logs", "subscription", "billing", "ai-policy", "ai-capabilities", "ai-requests", "content-guard", "ad-banner-poster", "field-config", "template-overrides", "noi-bo", "proxy", "catalog-links", "product-intelligence", "internal", "content-studio", "social-publishing"] as const

/** Mọi operation đã khai — test giữ ở ALG không có operation nào trỏ route không tồn tại. */
export const INTERNAL_OPERATIONS_DECLARED: OpenApiOperation[] = [...ORDER_OPERATIONS, ...PRODUCT_OPERATIONS, ...CRM_OPERATIONS, ...ORG_OPERATIONS, ...GREETING_ORDER_OPERATIONS, ...GREETING_OPERATIONS, ...COORDINATOR_OPERATIONS, ...CREATIVE_OPERATIONS, ...MEDIA_OPERATIONS, ...AI_STUDIO_OPERATIONS, ...NOTIFICATION_OPERATIONS, ...CHAT_OPERATIONS, ...CHAIN_OPERATIONS, ...COSTING_OPERATIONS, ...INTEGRATION_HUB_OPERATIONS, ...STORAGE_OPERATIONS, ...BRAND_OPERATIONS, ...CONTENT_OPERATIONS, ...MISC_OPERATIONS, ...PROFILE_OPERATIONS, ...MARKETING_OPERATIONS, ...PRODUCT_EXTRA_OPERATIONS, ...ADMIN_OPERATIONS, ...TOOLS_OPERATIONS, ...FINAL_OPERATIONS, ...STUDIO_OPERATIONS]

/** Bản cắt bàn giao chỉ còn route được giao: bỏ operation của route đã cắt (kế hoạch GD1, Bước 2.3). */
export const INTERNAL_OPERATIONS: OpenApiOperation[] = INTERNAL_OPERATIONS_DECLARED.filter((o) => isKnownApiRoute(o.path))

export function buildInternalOpenApi(): Record<string, unknown> {
  return buildOpenApiDocument({
    title: "ALG Internal API",
    version: "1.0.0",
    description: [
      "API nội bộ của ứng dụng tiệm — chỉ giao diện ALG gọi, không phải API công khai (xem Integration API).",
      "Mọi route cần phiên đăng nhập của thành viên tổ chức; `organization_id` lấy từ phiên, không nhận từ thân/query.",
      "Quyền theo mã năng lực (`x-capability`), không theo tên vai. Bản ghi của tổ chức khác trả 404, không bao giờ 403.",
      "Lỗi chung: thiếu phiên 401; thiếu quyền, công cụ bị khoá, đang dùng mật khẩu tạm 403; phiên chưa chọn tổ chức 409;",
      "lệnh ghi khi gói quá hạn 402.",
    ].join(" "),
    serverUrl: "/api/v1",
    securitySchemes: {
      tenantSession: { type: "apiKey", in: "cookie", name: "alg_session", description: "Phiên đăng nhập của thành viên tổ chức" },
      platformSession: { type: "apiKey", in: "cookie", name: "alg_session", description: "Phiên của người vận hành nền tảng (vài route cấu hình hộ tổ chức)" },
    },
    operations: INTERNAL_OPERATIONS,
  })
}
