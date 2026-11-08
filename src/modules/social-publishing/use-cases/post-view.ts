import type { SocialPostRow } from "../infra/social-post-repository"

/** Bài đăng trên API (snake_case, chuẩn API Contract v1.1). Không chứa khoá hay link ký. */
export interface SocialPostView {
  readonly id: string
  readonly content_generation_id: string | null
  readonly product_id: string | null
  readonly channel: string
  readonly text: string
  readonly hashtags: readonly string[]
  readonly image_count: number
  readonly status: string
  readonly scheduled_at: string
  readonly next_attempt_at: string | null
  readonly attempt_count: number
  readonly published_at: string | null
  readonly external_url: string | null
  readonly error_code: string | null
  readonly error_message: string | null
  readonly created_at: string
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])

export function toPostView(r: SocialPostRow): SocialPostView {
  return {
    id: r.id,
    content_generation_id: r.content_generation_id,
    product_id: r.product_id,
    channel: r.channel,
    text: r.text,
    hashtags: strings(r.hashtags),
    image_count: strings(r.media_asset_ids).length,
    status: r.status,
    scheduled_at: r.scheduled_at.toISOString(),
    next_attempt_at: r.next_attempt_at?.toISOString() ?? null,
    attempt_count: r.attempt_count,
    published_at: r.published_at?.toISOString() ?? null,
    external_url: r.external_url,
    error_code: r.last_error_code,
    error_message: r.last_error_message,
    created_at: r.created_at.toISOString(),
  }
}
