/**
 * Zalo Official Account — đăng BÀI VIẾT lên trang OA qua API chính thức (Bước 4, PO 08/11/2026). Thu hoạch từ SocialFlow
 * `zalo-oa-automation.py` (hạng ADAPTER). Khác bản gốc:
 *  - khoá theo TỪNG tổ chức (bản gốc đọc một bộ ZALO_* chung của máy chủ → mọi tổ chức đăng lên cùng một OA — đúng loại
 *    lỗi "đăng nhầm thương hiệu" SocialFlow đã sửa cho Facebook);
 *  - ảnh bìa + ảnh trong bài gửi bằng link ký của kho (`photo_url`) thay vì tải tệp từ đĩa;
 *  - KHÔNG tự gửi tin quảng bá tới người theo dõi (`oa/message` broadcast của bản gốc) — đó là tin nhắn có hạn mức và
 *    cần duyệt riêng; đăng bài viết lên trang OA là đủ cho "đăng bài". Bật gửi tin là quyết định sau của PO.
 * Làm mới access token (refresh token Zalo chỉ dùng MỘT lần) nằm ở tầng khoá kết nối, không ở đây.
 */
import type { ChannelCredential, PublishRequest, PublishResult, PublisherProvider } from "@/core/ports/publisher-provider"
import { callJson, obj, str, transientFailure, type FetchLike, type JsonResponse } from "./http-call"

export const ZALO_API = "https://openapi.zalo.me/v2.0"

/** Mã lỗi Zalo OA → loại xử lý (developers.zalo.me — bảng mã lỗi Official Account API). */
export function classifyZaloError(r: JsonResponse): PublishResult {
  const code = typeof r.body.error === "number" ? r.body.error : null
  const raw = str(r.body.message) ?? ""
  if (code === -216 || code === -124 || code === -230) return { ok: false, kind: "NEEDS_ACTION", code: "TOKEN_EXPIRED", message: "Kết nối Zalo OA đã hết hạn — kết nối lại để tiếp tục đăng" }
  if (code === -217 || code === -224) return { ok: false, kind: "NEEDS_ACTION", code: "PERMISSION", message: "Zalo OA chưa cấp quyền đăng bài viết cho ứng dụng — kết nối lại và đồng ý quyền" }
  if (code === -32 || code === -232) return { ok: false, kind: "RETRYABLE", code: "RATE_LIMIT", message: "Zalo tạm giới hạn số lượt — hệ thống sẽ thử lại" }
  return { ok: false, kind: "NEEDS_ACTION", code: code !== null ? `ZALO_${code}` : `HTTP_${r.status}`, message: `Zalo từ chối bài: ${raw || "lỗi không rõ"}` }
}

export function createZaloOaPublisher(fetchImpl: FetchLike = fetch): PublisherProvider {
  return {
    channel: "zalo",
    async publish(req: PublishRequest, cred: ChannelCredential): Promise<PublishResult> {
      const [cover, ...rest] = req.imageUrls
      if (!cover) return { ok: false, kind: "NEEDS_ACTION", code: "NO_COVER", message: "Zalo cần ít nhất 1 ảnh làm ảnh bìa" }
      const body = [
        { type: "text", content: req.caption },
        ...rest.map((url) => ({ type: "image", url })),
      ]
      const article = {
        type: "normal",
        title: req.title,
        author: "",
        cover: { cover_type: "photo", photo_url: cover, status: "show" },
        description: req.title,
        body,
        status: "show",
        comment: "show",
      }
      try {
        const r = await callJson(fetchImpl, "zalo-oa", `${ZALO_API}/article/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", access_token: cred.accessToken },
          body: JSON.stringify(article),
        })
        if (r.status !== 200 || r.body.error !== 0) return classifyZaloError(r)
        // Zalo xử lý bài bất đồng bộ và trả `token` của bài — dùng làm mã bài
        const token = str(obj(r.body.data).token)
        if (!token) return { ok: false, kind: "RETRYABLE", code: "NO_POST_ID", message: "Zalo chưa trả mã bài — hệ thống sẽ kiểm tra lại" }
        return { ok: true, externalId: token, url: null }
      } catch (e) {
        return transientFailure(e, "Zalo")
      }
    },
  }
}
