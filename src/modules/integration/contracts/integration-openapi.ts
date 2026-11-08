import { buildOpenApiDocument, type OpenApiOperation } from "@/core/http/openapi"
import { INTEGRATION_RATE_LIMIT } from "@/modules/integration/domain/integration-rate-limit"

import * as req from "./http-requests"
import * as res from "./http-responses"

/**
 * OpenAPI 3.1 của Integration API (`/api/v1/integration/*`, đặc tả 06 mục 11, đặc tả 08) — bề mặt máy
 * gọi máy cho LocalBudd/SocialFlow (audit API đợt 4, PO 07/11/2026). Tệp sinh ra:
 * `docs/spec/contracts/openapi/integration.openapi.json` (`npm run gen:openapi`).
 * `tests/unit/integration/integration-openapi.test.ts` đỏ khi tệp đó cũ, hoặc khi route và danh sách
 * dưới đây lệch nhau.
 */
export const INTEGRATION_OPENAPI_PATH = "docs/spec/contracts/openapi/integration.openapi.json"

const BOTH = ["integrationToken", "smeosSso"]
const BASE_ERRORS = [401, 429, 500]
const tags = (name: string) => [name]

export const INTEGRATION_OPERATIONS: OpenApiOperation[] = [
  {
    method: "get", path: "/integration/products", operationId: "integrationListProducts", tags: tags("Sản phẩm"),
    summary: "Product Master của tổ chức",
    description: "Luôn chỉ sản phẩm `ACTIVE`. Khối `pricing` là `null` khi người gọi không có `L5` (token máy gọi máy luôn không có).",
    security: BOTH, query: req.listProductsQuery,
    responses: { 200: { description: "Một trang sản phẩm", schema: res.listProductsResponse } },
    errors: [400, ...BASE_ERRORS],
  },
  {
    method: "get", path: "/integration/products/{id}/master-image", operationId: "integrationGetMasterImage", tags: tags("Sản phẩm"),
    summary: "Ảnh Master đã duyệt và các tỉ lệ dẫn xuất",
    description: "Chỉ ảnh `APPROVED`; chưa có ảnh duyệt, sản phẩm không `ACTIVE` hoặc thuộc tổ chức khác → 404. `url` là URL ký sẵn, tuyệt đối.",
    security: BOTH,
    responses: { 200: { description: "Ảnh Master", schema: res.masterImageResponse } },
    errors: [404, ...BASE_ERRORS],
  },
  {
    method: "get", path: "/integration/brand-profile", operationId: "integrationGetBrandProfile", tags: tags("Hồ sơ"),
    summary: "Hồ sơ thương hiệu (màu, font, tông giọng)", security: BOTH,
    responses: { 200: { description: "Hồ sơ, hoặc `null` khi tổ chức chưa nhập", schema: res.brandProfileResponse } },
    errors: BASE_ERRORS,
  },
  {
    method: "get", path: "/integration/business-profile", operationId: "integrationGetBusinessProfile", tags: tags("Hồ sơ"),
    summary: "Hồ sơ kinh doanh",
    description: "Token máy gọi máy: chỉ token `LOCALBUDD`. Nhánh SSO: theo năng lực thật của người dùng.",
    security: BOTH,
    responses: { 200: { description: "Hồ sơ, hoặc `null` khi tổ chức chưa nhập", schema: res.businessProfileResponse } },
    errors: [403, ...BASE_ERRORS],
  },
  {
    method: "post", path: "/integration/capabilities/check", operationId: "integrationCheckCapabilities", tags: tags("Quyền"),
    summary: "Hỏi một người có những mã năng lực nào",
    description: "Người không thuộc tổ chức của token → mọi mã `false` (không rò rỉ). Mã không có trong catalog bị bỏ qua.",
    security: BOTH, body: req.checkCapabilitiesBody,
    responses: { 200: { description: "Kết quả theo từng mã", schema: res.capabilitiesCheckResponse } },
    errors: [400, 413, ...BASE_ERRORS],
  },
  {
    method: "post", path: "/integration/jobs", operationId: "integrationCreateJob", tags: tags("Job & mức dùng"),
    summary: "Tạo job thay mặt tổ chức",
    description: "Cùng đường kiểm hạn mức → ghi usage → tạo job như job nội bộ. Cùng `idempotency_key` → trả job cũ với 200.",
    security: BOTH, body: req.createJobBody,
    responses: {
      201: { description: "Job mới", schema: res.createJobResponse },
      200: { description: "Job đã có với cùng `idempotency_key` (`deduped: true`)", schema: res.createJobResponse },
    },
    errors: [400, 413, 422, ...BASE_ERRORS],
  },
  {
    method: "post", path: "/integration/usage", operationId: "integrationRecordUsage", tags: tags("Job & mức dùng"),
    summary: "Ghi mức dùng phát sinh ở engine ngoài", description: "Không trừ credit lần hai (`cost_credit` = 0).",
    security: BOTH, body: req.recordUsageBody,
    responses: { 201: { description: "Dòng usage đã ghi", schema: res.usageResponse } },
    errors: [400, 413, ...BASE_ERRORS],
  },
  {
    method: "post", path: "/integration/assets", operationId: "integrationRegisterAsset", tags: tags("Asset"),
    summary: "Đăng ký asset dẫn xuất",
    description: "`parent_asset_id` phải là asset `APPROVED` cùng tổ chức; asset mới luôn `PENDING`; `storage_key` phải khớp tổ chức/sản phẩm/asset. `generated_flags` (`{ generative_fill_used, requires_reshoot_warning }`) bắt buộc với asset dẫn xuất (YC-A5) dù lược đồ ghi tuỳ chọn — thiếu → 400.",
    security: BOTH, body: req.registerAssetBody,
    responses: { 201: { description: "Asset đã đăng ký", schema: res.assetResponse } },
    errors: [400, 413, 404, ...BASE_ERRORS],
  },
  {
    method: "post", path: "/integration/content-metrics", operationId: "integrationRecordContentMetrics", tags: tags("Số liệu"),
    summary: "Ghi số liệu hiệu quả nội dung",
    description: "Idempotent theo (`platform`, `content_id`, `metric_date`) trong tổ chức: gọi lại thì cập nhật dòng cũ.",
    security: BOTH, body: req.contentMetricsBody,
    responses: { 201: { description: "Dòng số liệu sau khi ghi", schema: res.contentMetricsResponse } },
    errors: [400, 413, ...BASE_ERRORS],
  },
  {
    method: "get", path: "/integration/catalog-links", operationId: "integrationListCatalogLinks", tags: tags("Catalog"),
    summary: "Danh sách liên kết catalog", description: "Cần `J1` — chỉ nhánh SSO (token máy gọi máy không có năng lực → 403).",
    security: BOTH, query: req.listCatalogLinksQuery,
    responses: { 200: { description: "Danh sách", schema: res.listCatalogLinksResponse } },
    errors: [400, 403, ...BASE_ERRORS], extensions: { "x-capability": "J1" },
  },
  {
    method: "post", path: "/integration/catalog-links", operationId: "integrationCreateCatalogLink", tags: tags("Catalog"),
    summary: "Tạo liên kết catalog", description: "Cần `J1` — chỉ nhánh SSO.",
    security: BOTH, body: req.createCatalogLinkBody,
    responses: { 201: { description: "Liên kết mới (bản ghi đầy đủ)", schema: res.catalogLinkRecord } },
    errors: [400, 413, 403, ...BASE_ERRORS], extensions: { "x-capability": "J1" },
  },
  {
    method: "patch", path: "/integration/catalog-links/{slug}", operationId: "integrationUpdateCatalogLink", tags: tags("Catalog"),
    summary: "Sửa liên kết catalog", description: "Cần `J1` — chỉ nhánh SSO.",
    security: BOTH, body: req.updateCatalogLinkBody,
    responses: { 200: { description: "Liên kết sau khi sửa", schema: res.catalogLinkView } },
    errors: [400, 413, 403, 404, ...BASE_ERRORS], extensions: { "x-capability": "J1" },
  },
  {
    method: "post", path: "/integration/catalog-links/{slug}/revoke", operationId: "integrationRevokeCatalogLink", tags: tags("Catalog"),
    summary: "Thu hồi liên kết catalog", description: "Cần `J2` — chỉ nhánh SSO.",
    security: BOTH,
    responses: { 200: { description: "Đã thu hồi", schema: res.revokeCatalogLinkResponse } },
    errors: [400, 403, 404, ...BASE_ERRORS], extensions: { "x-capability": "J2" },
  },
]

export function buildIntegrationOpenApi(): Record<string, unknown> {
  return buildOpenApiDocument({
    title: "SMEOS Integration API",
    version: "1.0.0",
    description: [
      "Bề mặt máy gọi máy cho LocalBudd và SocialFlow (đặc tả 06 mục 11, đặc tả 08). Tổ chức luôn suy từ",
      "chứng thư — không endpoint nào nhận `organization_id` từ client.",
      `Giới hạn tần suất: ${INTEGRATION_RATE_LIMIT.limit} lần/${INTEGRATION_RATE_LIMIT.windowMs / 1000} giây cho mỗi token`,
      "(nhánh SSO: mỗi người dùng trong một tổ chức). Lỗi theo envelope `Error`.",
    ].join(" "),
    serverUrl: "/api/v1",
    securitySchemes: {
      integrationToken: { type: "http", scheme: "bearer", description: "Token máy gọi máy cấp theo tổ chức (`/integration-tokens`)" },
      smeosSso: { type: "apiKey", in: "header", name: "x-smeos-sso", description: "JWT SSO thay mặt người dùng đang đăng nhập (header cũ `x-floraos-sso` vẫn nhận)" },
    },
    operations: INTEGRATION_OPERATIONS,
  })
}
