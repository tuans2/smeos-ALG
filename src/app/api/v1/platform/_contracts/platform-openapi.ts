import { buildOpenApiDocument, type OpenApiOperation } from "@/core/http/openapi"

import { CONFIG_OPERATIONS } from "./ops-config"
import { DATA_OPERATIONS } from "./ops-data"
import { ORG_OPERATIONS } from "./ops-orgs"

/**
 * OpenAPI 3.1 của Console Vận hành Nền tảng `/api/v1/platform/*` (PO 07/11/2026). Tệp sinh ra:
 * `docs/spec/contracts/openapi/platform.openapi.json` (`npm run gen:openapi`) — không sửa tay, không công bố ra
 * ngoài. `tests/unit/platform/platform-openapi.test.ts` đỏ khi tệp cũ hoặc khi route và danh sách dưới đây lệch.
 */
export const PLATFORM_OPENAPI_PATH = "docs/spec/contracts/openapi/platform.openapi.json"

export const PLATFORM_OPERATIONS: OpenApiOperation[] = [...ORG_OPERATIONS, ...CONFIG_OPERATIONS, ...DATA_OPERATIONS]

export function buildPlatformOpenApi(): Record<string, unknown> {
  return buildOpenApiDocument({
    title: "SMEOS Platform Console API",
    version: "1.0.0",
    description: [
      "API nội bộ của Console Vận hành Nền tảng — chỉ giao diện SMEOS gọi. Mọi route cần phiên của người vận hành",
      "nền tảng (`platform_operators`); quyền theo mã `N*` (`x-capability`), không theo vai của tổ chức. Đọc xuyên tổ",
      "chức là ngoại lệ có chủ đích (đặc tả 06 mục 21); route đọc/ghi dữ liệu một tổ chức ghi nhật ký truy cập (D-60).",
    ].join(" "),
    serverUrl: "/api/v1",
    securitySchemes: {
      platformSession: { type: "apiKey", in: "cookie", name: "smeos_session", description: "Phiên đăng nhập của người vận hành nền tảng" },
    },
    operations: PLATFORM_OPERATIONS,
  })
}
