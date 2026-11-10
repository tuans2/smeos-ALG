import { z } from "zod"

import { BRAND_STEPS } from "@/modules/brand-kit/domain/brand-journey"
import { BRAND_STYLE_KEYS } from "@/modules/brand-kit/domain/brand-styles"
import { BRAND_LIBRARY_CATEGORIES } from "@/modules/profiles/domain/brand-library"

/**
 * Phản hồi `/api/v1/brand-kit/*`, `/api/v1/brand-library/*`, `/api/v1/product-copies/*` (OpenAPI nội bộ, PO
 * 07/11/2026). Sinh từ kiểu TS của `brand-kit` (get-brand-kit, identity-option, landing-option, paid-option-job),
 * `profiles` (brand-library) và dòng `product_copies`, đối chiếu mẫu ghi từ phản hồi thật rồi kiểm ở
 * `tests/tenant/internal-contract-brand.test.ts`. `generated_package` (gói nội dung landing page — cấu trúc ở
 * `content-engine`) và `raw`/`edited` của dữ liệu bán hàng (đầu ra mô hình) khai là đối tượng tự do.
 */
const timestamp = z.iso.datetime()
const data = <T extends z.ZodType>(schema: T) => z.strictObject({ data: schema })
const STYLE = z.enum(BRAND_STYLE_KEYS)
const SOURCE = z.enum(["ai", "template"])
const STEP_STATUS = z.enum(["LOCKED", "AVAILABLE", "INPUT_REQUIRED", "READY", "PROCESSING", "COMPLETED", "FAILED", "RETRY"])
const jsonObject = z.record(z.string(), z.unknown())

const identityContent = z.strictObject({
  style_key: STYLE,
  variant: z.number(),
  palette: z.strictObject({ primary: z.string(), secondary: z.string(), accent: z.string(), background: z.string(), text: z.string() }),
  font_heading: z.string(),
  font_body: z.string(),
  logo_layout: z.enum(["MONOGRAM", "BADGE", "WORDMARK"]),
  initials: z.string(),
  slogan: z.string(),
  /** `template` = AI không chạy được, dùng khẩu hiệu dựng sẵn. */
  slogan_source: SOURCE,
  rationale: z.string(),
  generated_logo_asset_id: z.string().nullable(),
})
const landingContent = z.strictObject({
  style_key: STYLE,
  variant: z.number(),
  archetype_id: z.string(),
  style_id: z.string(),
  template_id: z.string(),
  headline: z.string(),
  sub_headline: z.string(),
  generated_package: jsonObject,
  identity_option_id: z.string(),
  content_source: SOURCE,
  published_slug: z.string().nullable(),
})
/** `extra` (trừ credit) trả `usage`; `refunded: true` = AI không chạy được, đã hoàn credit. */
const usage = z.strictObject({ costCredit: z.number(), balanceAfter: z.number().nullable(), refunded: z.boolean() }).nullable()
export const identityGeneratedResponse = data(z.strictObject({ created: z.array(z.strictObject({ id: z.string(), content: identityContent })), usage }))
export const landingGeneratedResponse = data(z.strictObject({ created: z.array(z.strictObject({ id: z.string(), content: landingContent })), usage }))
export const identitySelectedResponse = data(z.strictObject({ id: z.string(), content: identityContent, logo_asset_id: z.string().nullable() }))
/** Đường dẫn trang chính thức — giữ nguyên khi đổi phương án. */
export const landingSelectedResponse = data(z.strictObject({ id: z.string(), slug: z.string(), path: z.string() }))

const optionBase = { id: z.string(), batch: z.number(), is_latest_batch: z.boolean(), selected: z.boolean() }
export const brandKitResponse = data(
  z.strictObject({
    steps: z.array(z.strictObject({ key: z.enum(BRAND_STEPS), label: z.string(), status: STEP_STATUS })),
    current_step: z.enum(BRAND_STEPS),
    shop: z.strictObject({
      name: z.string(),
      phone: z.string().nullable(),
      email: z.string().nullable(),
      address: z.string().nullable(),
      website: z.string().nullable(),
      slogan: z.string().nullable(),
      logo_url: z.string().nullable(),
    }),
    profile: z.strictObject({
      done: z.boolean(),
      items: z.array(z.strictObject({ key: z.string(), label: z.string(), hint: z.string(), done: z.boolean() })),
      featured_products: z.array(z.strictObject({ id: z.string(), name: z.string(), active: z.boolean() })),
    }),
    identity: z.strictObject({
      recommended_style: STYLE,
      selected_id: z.string().nullable(),
      profile_changed: z.boolean(),
      can_refresh: z.boolean(),
      can_add: z.boolean(),
      uses_uploaded_logo: z.boolean(),
      options: z.array(
        z.strictObject({ ...optionBase, style_label: z.string(), style_description: z.string(), recommended: z.boolean(), content: identityContent })
      ),
    }),
    landing: z.strictObject({
      selected_id: z.string().nullable(),
      published_path: z.string().nullable(),
      profile_changed: z.boolean(),
      can_refresh: z.boolean(),
      can_add: z.boolean(),
      sections: z.array(z.string()),
      options: z.array(
        z.strictObject({
          ...optionBase,
          style_key: STYLE,
          style_label: z.string(),
          headline: z.string(),
          sub_headline: z.string(),
          story_title: z.string(),
          story_excerpt: z.string(),
          perks: z.array(z.string()),
          content_source: SOURCE,
        })
      ),
    }),
    pricing: z.strictObject({ extra_option_credit: z.number() }),
  })
)

const libraryVersion = z.strictObject({
  version: z.number(),
  text_value: z.string().nullable(),
  /** URL ký có hạn của ảnh phiên bản. */
  file_url: z.string().nullable(),
  note: z.string().nullable(),
  created_at: timestamp,
})
const libraryItem = z.strictObject({
  id: z.string(),
  title: z.string(),
  category: z.enum(BRAND_LIBRARY_CATEGORIES),
  description: z.string().nullable(),
  share_with_members: z.boolean(),
  status: z.enum(["ACTIVE", "ARCHIVED"]),
  current_version: z.number(),
  updated_at: timestamp,
  latest: libraryVersion.nullable(),
})
/** Một mục kèm mọi phiên bản (mới nhất trước). */
export const brandLibraryItemResponse = data(libraryItem.extend({ versions: z.array(libraryVersion) }))
export const brandLibraryResponse = data(z.array(libraryItem))
/** `data: null` khi tổ chức không thuộc chuỗi. */
export const brandLibraryChainResponse = data(z.strictObject({ chain_name: z.string(), items: z.array(libraryItem) }).nullable())

/** Dòng `product_copies` nguyên bản — route trả thẳng, không bọc `{ data }`. */
export const productCopyResponse = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  analysis_id: z.string(),
  product_id: z.string().nullable(),
  raw: jsonObject,
  edited: jsonObject.nullable(),
  approval_state: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  approved_by: z.string().nullable(),
  approved_at: timestamp.nullable(),
  profile_version: z.string().nullable(),
  reject_reason: z.string().nullable(),
  job_id: z.string().nullable(),
  model_key: z.string().nullable(),
  provider: z.string().nullable(),
  cost_usd: z.number().nullable(),
  latency_ms: z.number().nullable(),
  created_at: timestamp,
  updated_at: timestamp,
})
export const productCopiesResponse = data(z.array(productCopyResponse))
/** Lượt phân tích đã có bản → trả lại bản đó (`needsReview: false`), không gọi AI lần hai. */
export const productCopyGeneratedResponse = z.strictObject({ copyId: z.string(), raw: jsonObject, needsReview: z.boolean(), modelKey: z.string().nullable() })
