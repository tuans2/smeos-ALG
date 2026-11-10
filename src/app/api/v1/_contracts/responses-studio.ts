import { z } from "zod"

import { salesPitchRecord } from "@/modules/products/domain/sales-pitch-record"
import { POST_STATUSES } from "@/modules/social-publishing/domain/post-lifecycle"

/**
 * Phản hồi `/content-studio/*` và `/social-publishing/*` (OpenAPI nội bộ, PO 07/11/2026). Sinh từ kiểu TS của
 * `content-studio` (`ContentProductView`, `ContentLibraryItem`, `ScanResult`), `products/domain/sales-pitch-record`,
 * `social-publishing` (`SocialPostView`, `ChannelStatusView`), đối chiếu mẫu ghi từ phản hồi thật rồi kiểm ở
 * `tests/tenant/internal-contract-studio.test.ts`. Chuẩn API Contract v1.1: `{ data }` / `{ data, next_cursor }`, snake_case.
 */
const timestamp = z.iso.datetime()
const data = <T extends z.ZodType>(schema: T) => z.strictObject({ data: schema })
const json = z.unknown()
const CHANNEL = z.enum(["facebook", "instagram", "zalo", "tiktok"])

export const contentLibraryResponse = z.strictObject({
  data: z.array(
    z.strictObject({
      id: z.string(),
      name: z.string(),
      code: z.string(),
      status: z.string(),
      image_url: z.string().nullable(),
      has_copy: z.boolean(),
      has_pitch: z.boolean(),
      /** Có lượt bài đăng đa kênh đã duyệt — dùng được ở Bước 4. */
      has_posts: z.boolean(),
    })
  ),
  next_cursor: z.string().nullable(),
})

/** Thẻ chào đã chốt (`products.attributes.sales_pitch`); `version` tăng mỗi lần chốt lại. */
const storedSalesPitch = z.strictObject({ data: salesPitchRecord, finalized_at: timestamp, finalized_by: z.string(), version: z.number().int().positive() })
const channelPost = z.strictObject({ channel: z.string(), text: z.string(), hashtags: z.array(z.string()) })
export const contentProductResponse = data(
  z.strictObject({
    product: z.strictObject({ id: z.string(), name: z.string(), code: z.string(), status: z.string() }),
    /** Bản quét ảnh mới nhất (ưu tiên đã duyệt); `image_url` ký có hạn. */
    analysis: z.strictObject({ id: z.string(), approval_state: z.string(), image_url: z.string().nullable(), data: json }).nullable(),
    copy: z.strictObject({ id: z.string(), approval_state: z.string(), data: json }).nullable(),
    sales_pitch: storedSalesPitch.nullable(),
    /** Lượt bài đăng đa kênh mới nhất (Bước 3); chưa viết → `null`. */
    latest_posts: z
      .strictObject({
        generation_id: z.string(),
        status: z.string(),
        posts: z.array(channelPost),
        approved_posts: z.array(channelPost).nullable(),
        overall_score: z.number().nullable(),
        created_at: timestamp,
      })
      .nullable(),
    flags: z.strictObject({ card_approved: z.boolean(), copy_approved: z.boolean(), pitch_saved: z.boolean(), approved_posts: z.number() }),
  })
)
export const salesPitchSavedResponse = data(storedSalesPitch)
/** Mỗi ảnh một dòng, tối đa 20. Lượt của tổ chức khác → danh sách rỗng (không 404). */
export const scanResultsResponse = data(
  z.array(
    z.strictObject({
      id: z.string(),
      asset_id: z.string(),
      product_id: z.string().nullable(),
      approval_state: z.enum(["PENDING", "APPROVED", "REJECTED"]),
      image_url: z.string().nullable(),
      data: z.record(z.string(), z.unknown()),
    })
  )
)

/** Không trả khoá. `app_configured: false` → nền tảng chưa cấu hình ứng dụng, kênh chưa mở. */
export const channelsResponse = data(
  z.array(
    z.strictObject({
      channel: CHANNEL,
      connected: z.boolean(),
      status: z.string().nullable(),
      display_name: z.string().nullable(),
      expires_at: timestamp.nullable(),
      app_configured: z.boolean(),
    })
  )
)
export const connectStartedResponse = data(z.strictObject({ authorize_url: z.string() }))
export const pendingPagesResponse = data(z.array(z.strictObject({ id: z.string(), name: z.string(), has_instagram: z.boolean() })))
export const pageSelectedResponse = data(z.strictObject({ connected: z.array(CHANNEL) }))

const post = z.strictObject({
  id: z.string(),
  content_generation_id: z.string().nullable(),
  product_id: z.string().nullable(),
  channel: CHANNEL,
  text: z.string(),
  hashtags: z.array(z.string()),
  image_count: z.number(),
  status: z.enum(POST_STATUSES),
  scheduled_at: timestamp,
  next_attempt_at: timestamp.nullable(),
  attempt_count: z.number(),
  published_at: timestamp.nullable(),
  external_url: z.string().nullable(),
  error_code: z.string().nullable(),
  error_message: z.string().nullable(),
  created_at: timestamp,
})
export const postsResponse = z.strictObject({ data: z.array(post), next_cursor: z.string().nullable() })
/** Mỗi kênh một bài. */
export const postsScheduledResponse = data(z.array(post))
export const postResponse = data(post)
