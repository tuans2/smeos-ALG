import { z } from "zod"

/**
 * Lược đồ thân/query của Integration API (`/api/v1/integration/*`, đặc tả 06 mục 11) — NGUỒN DUY NHẤT
 * cho cả route lẫn OpenAPI (`integration-openapi.ts`, audit API đợt 4, PO 07/11/2026). Chuyển nguyên
 * văn từ route, không đổi luật kiểm.
 *
 * Ngoại lệ: ba route `integration/catalog-links*` (vùng Catalog từng đóng băng, PO gỡ 09/11/2026 — D-66)
 * vẫn tự khai lược đồ; bản ở cuối tệp là bản
 * sao để tài liệu hoá, `tests/unit/integration/integration-catalog-contract.test.ts` gửi mẫu tới chính
 * route đóng băng để giữ hai bản khớp.
 */

export const registerAssetBody = z.object({
  asset_id: z.string().uuid(),
  product_id: z.string().min(1).nullable().optional(),
  parent_asset_id: z.string().uuid(),
  kind: z.enum(["MARKETING", "CATALOG", "LANDING", "SOCIAL", "VIDEO"]),
  storage_key: z.string().min(1),
  mime_type: z.string().min(1),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  aspect_ratio: z.string().nullable().optional(),
  file_size: z.number().int().positive().nullable().optional(),
  provider: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  model_version: z.string().nullable().optional(),
  pipeline_version: z.string().nullable().optional(),
  parameters: z.record(z.string(), z.unknown()).nullable().optional(),
  prompt: z.string().nullable().optional(),
  output_sha256: z.string().nullable().optional(),
  quality_score: z.number().nullable().optional(),
  identity_score: z.number().nullable().optional(),
  generated_flags: z.record(z.string(), z.unknown()).nullable().optional(),
  cost_usd: z.number().nullable().optional(),
})

export const checkCapabilitiesBody = z.object({
  user_id: z.string().min(1),
  capability_codes: z.array(z.string().min(1)).min(1),
})

export const contentMetricsBody = z.object({
  platform: z.string().min(1),
  content_id: z.string().min(1),
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reach: z.number().int().nonnegative().nullable().optional(),
  impressions: z.number().int().nonnegative().nullable().optional(),
  engagement: z.number().int().nonnegative().nullable().optional(),
  clicks: z.number().int().nonnegative().nullable().optional(),
  conversions: z.number().int().nonnegative().nullable().optional(),
  spend_usd: z.number().nullable().optional(),
})

export const createJobBody = z.object({
  feature: z.string().min(1),
  payload: z.unknown(),
  product_id: z.string().min(1).nullable().optional(),
  idempotency_key: z.string().min(1),
})

export const recordUsageBody = z.object({
  feature: z.string().min(1),
  quantity: z.number().int().positive().optional(),
  cost_usd: z.number().nullable().optional(),
  status: z.enum(["COMPLETED", "REFUNDED"]),
  job_id: z.string().min(1).nullable().optional(),
})

/**
 * Query của `GET /integration/products` — route tự đọc từng tham số (giữ hành vi cũ); lược đồ này chỉ
 * mô tả cho OpenAPI. `limit` không có trần ở route này (mặc định của `listProducts`).
 */
export const listProductsQuery = z.object({
  limit: z.number().int().optional(),
  cursor: z.string().optional(),
  branch_id: z.string().optional(),
  category: z.string().optional(),
  occasion_code: z.string().optional(),
  color: z.string().optional(),
  collection: z.string().optional(),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
})

// ── Bản sao lược đồ của route Catalog đóng băng (xem đầu tệp) ─────────────────────────────────
export const listCatalogLinksQuery = z.object({
  // `z.coerce.boolean()` đọc chuỗi "false" thành true (PO 07/11/2026 cho sửa) — stringbool nhận true/false/1/0/yes/no
  include_revoked: z.stringbool().optional(),
})

export const createCatalogLinkBody = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  filters: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const updateCatalogLinkBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  filters: z.record(z.string(), z.unknown()).nullable().optional(),
})
