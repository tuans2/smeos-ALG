/**
 * Cổng đăng bài ra mạng xã hội (Bước 4 "Đăng tự động", module `social-publishing`, PO 08/11/2026 — thay phần đăng bài
 * của SocialFlow). Mỗi nền tảng một adapter ở `src/modules/social-publishing/adapters/`, gọi API CHÍNH THỨC (Meta Graph,
 * Zalo OA, TikTok Content Posting) bằng khoá kết nối của chính tổ chức — không mật khẩu, không tự động hoá trình duyệt.
 * Mọi lời gọi ra ngoài có timeout + cầu dao ngắt; không ghi log khoá.
 */

export type SocialChannel = "facebook" | "instagram" | "zalo" | "tiktok"

/** Khoá đã mở trong use-case — chỉ sống trong bộ nhớ, không trả về client. */
export interface ChannelCredential {
  readonly accessToken: string
  /** Page ID (Facebook) · IG user ID (Instagram) · OA ID (Zalo) · open_id (TikTok) */
  readonly accountId: string
}

export interface PublishRequest {
  /** Nội dung đã ghép hashtag, đã qua kiểm trước khi đăng */
  readonly caption: string
  /** Tiêu đề ngắn (Zalo bài viết, TikTok ảnh) — rút từ dòng đầu nếu không có */
  readonly title: string
  /** Link ảnh công khai có hạn (link ký của kho), theo thứ tự */
  readonly imageUrls: readonly string[]
}

/** RETRYABLE: mạng / nền tảng tạm lỗi / quá tần suất → thử lại có giới hạn. NEEDS_ACTION: hết hạn kết nối, thiếu quyền, nội dung bị từ chối → báo user, không thử lại. */
export type PublishFailureKind = "RETRYABLE" | "NEEDS_ACTION"

export type PublishResult =
  | { readonly ok: true; readonly externalId: string; readonly url: string | null }
  | { readonly ok: false; readonly kind: PublishFailureKind; readonly code: string; readonly message: string }

export interface PublisherProvider {
  readonly channel: SocialChannel
  publish(request: PublishRequest, credential: ChannelCredential): Promise<PublishResult>
}
