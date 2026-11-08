import { z } from "zod"

/**
 * Lược đồ PHẢN HỒI của Integration API (audit API đợt 4, PO 07/11/2026) — mô tả đúng JSON mà route trả
 * hôm nay (bản ghi use-case qua `JSON.stringify`: `Date` → chuỗi ISO), kể cả vài khoá camelCase cũ
 * (`masterImageUrl`, `driveLink`). Đối tượng khai `strictObject`: trường mới chưa ghi vào đây làm
 * `tests/tenant/integration-contract.test.ts` đỏ, nên tài liệu không trôi khỏi mã.
 */
const timestamp = z.iso.datetime()
const json = z.unknown()
const jsonRecord = z.record(z.string(), z.unknown()).nullable()

export const capabilitiesCheckResponse = z.strictObject({
  /** Mã năng lực hợp lệ đã hỏi → có/không. Mã không có trong catalog bị bỏ qua. */
  granted: z.record(z.string(), z.boolean()),
})

export const assetResponse = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  product_id: z.string().nullable(),
  parent_asset_id: z.string().nullable(),
  kind: z.string(),
  state: z.string(),
  version: z.number().int(),
  storage_key: z.string(),
  thumb_key: z.string().nullable(),
  mime_type: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  aspect_ratio: z.string().nullable(),
  file_size: z.number().int().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  model_version: z.string().nullable(),
  pipeline_version: z.string().nullable(),
  parameters: json,
  prompt: z.string().nullable(),
  input_sha256: z.string().nullable(),
  output_sha256: z.string().nullable(),
  quality_score: z.number().nullable(),
  identity_score: z.number().nullable(),
  generated_flags: json,
  cost_usd: z.number().nullable(),
  approval_state: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  approved_by: z.string().nullable(),
  approved_at: timestamp.nullable(),
  metadata: json,
  created_by: z.string(),
  created_at: timestamp,
  trashed_at: timestamp.nullable(),
  purge_after: timestamp.nullable(),
  legal_hold_until: timestamp.nullable(),
  updated_at: timestamp,
})

export const contentMetricsResponse = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  platform: z.string(),
  content_id: z.string(),
  metric_date: timestamp,
  reach: z.number().int().nullable(),
  impressions: z.number().int().nullable(),
  engagement: z.number().int().nullable(),
  clicks: z.number().int().nullable(),
  conversions: z.number().int().nullable(),
  spend_usd: z.number().nullable(),
  created_at: timestamp,
  updated_at: timestamp,
})

export const generationJobResponse = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  workspace_id: z.string(),
  branch_id: z.string().nullable(),
  user_id: z.string(),
  product_id: z.string().nullable(),
  feature: z.string(),
  status: z.string(),
  stage: z.string().nullable(),
  result: z.string().nullable(),
  idempotency_key: z.string().nullable(),
  job_group_id: z.string().nullable(),
  request_id: z.string().nullable(),
  run_after: timestamp.nullable(),
  failure_kind: z.string().nullable(),
  payload: json,
  output: json,
  error: z.string().nullable(),
  attempts: z.number().int(),
  created_at: timestamp,
  started_at: timestamp.nullable(),
  completed_at: timestamp.nullable(),
  cancelled_at: timestamp.nullable(),
  updated_at: timestamp,
})

export const createJobResponse = z.strictObject({
  job: generationJobResponse,
  /** `true` khi cùng `idempotency_key` đã có job — trả job cũ (HTTP 200 thay vì 201). */
  deduped: z.boolean(),
  usage: z.strictObject({ costCredit: z.number().int(), balanceAfter: z.number().int().nullable() }),
})

export const usageResponse = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  workspace_id: z.string(),
  user_id: z.string(),
  job_id: z.string().nullable(),
  feature: z.string(),
  quantity: z.number().int(),
  cost_credit: z.number().int(),
  cost_usd: z.number().nullable(),
  status: z.string(),
  metadata: json,
  created_at: timestamp,
})

const productPricing = z.strictObject({
  partner_tier_bonus: z.record(z.string(), z.number()),
  surcharge_groups: z.array(z.unknown()),
  optimal_price_ratio: z.number(),
  floor_ceiling_ratio: z.strictObject({ floorRatio: z.number(), ceilingRatio: z.number() }),
})

export const productResponse = z.strictObject({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  shape: z.string().nullable(),
  facing: z.string().nullable(),
  container: z.string().nullable(),
  status: z.string(),
  branch_id: z.string().nullable(),
  masterImageUrl: z.string().optional(),
  /** `null` = "Liên hệ để báo giá", không phải 0đ. */
  price_vnd: z.number().nullable(),
  driveLink: z.string().optional(),
  /** `null` khi người gọi không có `L5` (token máy gọi máy luôn không có). */
  pricing: productPricing.nullable(),
  redacted_fields: z.array(z.string()),
  attributes: jsonRecord.optional(),
  availability_config: json.optional(),
  commerce: z.strictObject({
    barcode: z.string().nullable(),
    cost_price_vnd: z.number().nullable(),
    vat_percent: z.number().nullable(),
    weight_grams: z.number().nullable(),
    tags: z.array(z.string()),
  }),
})

export const listProductsResponse = z.strictObject({
  data: z.array(productResponse),
  next_cursor: z.string().nullable(),
})

const integrationAsset = z.strictObject({
  id: z.string(),
  version: z.number().int(),
  storage_key: z.string(),
  /** URL ký sẵn, tuyệt đối, tải được ảnh thật. */
  url: z.string(),
  thumb_key: z.string().nullable(),
  mime_type: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  aspect_ratio: z.string().nullable(),
  created_at: timestamp,
})

export const masterImageResponse = z.strictObject({ master: integrationAsset, ratios: z.array(integrationAsset) })

/** `null` khi tổ chức chưa nhập hồ sơ thương hiệu. */
export const brandProfileResponse = z
  .strictObject({
    primary_color: z.string().nullable(),
    secondary_color: z.string().nullable(),
    accent_color: z.string().nullable(),
    background_color: z.string().nullable(),
    text_color: z.string().nullable(),
    font_heading: z.string().nullable(),
    font_body: z.string().nullable(),
    logo_asset_id: z.string().nullable(),
    logo_url: z.string().nullable(),
    tone_of_voice: z.string().nullable(),
    hashtags: jsonRecord,
    cta_templates: jsonRecord,
    default_offers: jsonRecord,
    forbidden_styles: jsonRecord,
    brand_assets: jsonRecord,
  })
  .nullable()

/** `null` khi tổ chức chưa nhập hồ sơ kinh doanh. */
export const businessProfileResponse = z
  .strictObject({
    legal_name: z.string().nullable(),
    display_name: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    address: z.string().nullable(),
    website: z.string().nullable(),
    social_links: jsonRecord,
    tax_code: z.string().nullable(),
    description: z.string().nullable(),
    operating_hours: jsonRecord,
    brand_message: z.string().nullable(),
    target_customers: z.array(z.string()),
  })
  .nullable()

/** Bản ghi đầy đủ — `POST /integration/catalog-links` trả nguyên dòng vừa tạo. */
export const catalogLinkRecord = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  filters: json,
  is_revoked: z.boolean(),
  revoked_at: timestamp.nullable(),
  revoked_by: z.string().nullable(),
  created_by: z.string(),
  created_at: timestamp,
  trashed_at: timestamp.nullable(),
  purge_after: timestamp.nullable(),
  updated_at: timestamp,
})

/** Dạng đọc lại (liệt kê, sau khi sửa): không có `organization_id`, `trashed_at`, `purge_after`. */
export const catalogLinkView = catalogLinkRecord.omit({ organization_id: true, trashed_at: true, purge_after: true })

export const listCatalogLinksResponse = z.strictObject({ data: z.array(catalogLinkView) })
export const revokeCatalogLinkResponse = z.strictObject({ revoked: z.literal(true) })
