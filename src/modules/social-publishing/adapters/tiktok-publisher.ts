/**
 * TikTok qua Content Posting API chính thức — đăng bài ẢNH (photo mode) từ ảnh sản phẩm (Bước 4, PO 08/11/2026 — đăng
 * ký ứng dụng ngay). Thay `tiktok-automation.py` của SocialFlow (tự động hoá trình duyệt + đăng nhập QR tay — không
 * thu hoạch). Hai lưu ý của TikTok, ghi rõ để không bất ngờ:
 *  - Ứng dụng CHƯA qua duyệt (audit) của TikTok chỉ được đăng ở chế độ riêng tư → lấy mức hiển thị hợp lệ từ
 *    `creator_info` thay vì đoán; qua duyệt rồi mới đăng công khai được.
 *  - `PULL_FROM_URL` yêu cầu tên miền chứa ảnh (kho tệp) đã được xác minh trong cổng nhà phát triển TikTok.
 * TikTok xử lý bài bất đồng bộ; mã trả về là `publish_id`.
 */
import type { ChannelCredential, PublishRequest, PublishResult, PublisherProvider } from "@/core/ports/publisher-provider"
import { callJson, obj, str, transientFailure, type FetchLike, type JsonResponse } from "./http-call"

export const TIKTOK_API = "https://open.tiktokapis.com/v2"

const NEEDS_ACTION: Readonly<Record<string, string>> = {
  access_token_invalid: "Kết nối TikTok đã hết hạn — kết nối lại để tiếp tục đăng",
  scope_not_authorized: "TikTok chưa cấp quyền đăng bài cho ứng dụng — kết nối lại và đồng ý quyền",
  url_ownership_unverified: "Tên miền chứa ảnh chưa được xác minh với TikTok — quản trị hệ thống cần xác minh",
  privacy_level_option_mismatch: "Tài khoản TikTok không cho mức hiển thị này — kiểm tra cài đặt tài khoản",
  unaudited_client_can_only_post_to_private_accounts: "Ứng dụng TikTok chưa qua duyệt nên chỉ đăng được ở chế độ riêng tư",
  spam_risk_too_many_posts: "TikTok giới hạn số bài trong ngày — đăng lại vào ngày mai",
}
const RETRYABLE = new Set(["rate_limit_exceeded", "internal_error"])

export function classifyTikTokError(r: JsonResponse): PublishResult {
  const code = str(obj(r.body.error).code) ?? `HTTP_${r.status}`
  if (RETRYABLE.has(code)) return { ok: false, kind: "RETRYABLE", code, message: "TikTok tạm thời giới hạn — hệ thống sẽ thử lại" }
  const known = NEEDS_ACTION[code]
  return { ok: false, kind: "NEEDS_ACTION", code, message: known ?? `TikTok từ chối bài: ${str(obj(r.body.error).message) ?? code}` }
}

const ok = (r: JsonResponse) => r.status === 200 && (str(obj(r.body.error).code) ?? "ok") === "ok"

/** Mức hiển thị: công khai nếu tài khoản cho phép, không thì mức đầu tiên TikTok trả về (vd. chỉ mình tôi). */
export function pickPrivacy(options: readonly string[]): string | null {
  if (options.includes("PUBLIC_TO_EVERYONE")) return "PUBLIC_TO_EVERYONE"
  return options[0] ?? null
}

export function createTikTokPublisher(fetchImpl: FetchLike = fetch): PublisherProvider {
  return {
    channel: "tiktok",
    async publish(req: PublishRequest, cred: ChannelCredential): Promise<PublishResult> {
      const headers = { Authorization: `Bearer ${cred.accessToken}`, "Content-Type": "application/json; charset=UTF-8" }
      try {
        const info = await callJson(fetchImpl, "tiktok", `${TIKTOK_API}/post/publish/creator_info/query/`, { method: "POST", headers, body: "{}" })
        if (!ok(info)) return classifyTikTokError(info)
        const options = obj(info.body.data).privacy_level_options
        const privacy = pickPrivacy(Array.isArray(options) ? options.filter((o): o is string => typeof o === "string") : [])
        if (!privacy) return { ok: false, kind: "NEEDS_ACTION", code: "NO_PRIVACY_OPTION", message: "Tài khoản TikTok chưa cho phép đăng bài từ ứng dụng" }

        const init = await callJson(fetchImpl, "tiktok", `${TIKTOK_API}/post/publish/content/init/`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            post_info: { title: req.title, description: req.caption, privacy_level: privacy, disable_comment: false, auto_add_music: true },
            source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: req.imageUrls },
            post_mode: "DIRECT_POST",
            media_type: "PHOTO",
          }),
        })
        if (!ok(init)) return classifyTikTokError(init)
        const publishId = str(obj(init.body.data).publish_id)
        if (!publishId) return { ok: false, kind: "RETRYABLE", code: "NO_POST_ID", message: "TikTok chưa trả mã bài — hệ thống sẽ kiểm tra lại" }
        return { ok: true, externalId: publishId, url: null }
      } catch (e) {
        return transientFailure(e, "TikTok")
      }
    },
  }
}
