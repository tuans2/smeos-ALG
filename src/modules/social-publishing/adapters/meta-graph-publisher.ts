/**
 * Facebook Page + Instagram Business qua Meta Graph API (Bước 4, PO 08/11/2026). Thu hoạch từ SocialFlow
 * `facebook_graph.py` (hạng ADAPTER): đăng chữ / 1 ảnh / nhiều ảnh trong MỘT bài. Khác bản gốc: ảnh gửi bằng link ký
 * của kho (`url`, `image_url`) thay vì tải tệp từ đĩa; khoá là Page token / IG token của CHÍNH tổ chức.
 * Instagram (bản gốc tự động hoá trình duyệt) nay dùng API Content Publishing chính thức: tạo container → publish.
 */
import type { ChannelCredential, PublishRequest, PublishResult, PublisherProvider } from "@/core/ports/publisher-provider"
import { callJson, obj, str, transientFailure, type FetchLike, type JsonResponse } from "./http-call"

export const GRAPH_VERSION = "v21.0"
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`

/** Mã lỗi Graph → loại xử lý. Tài liệu: developers.facebook.com/docs/graph-api/guides/error-handling */
export function classifyGraphError(r: JsonResponse, label: string): PublishResult {
  const e = obj(r.body.error)
  const code = typeof e.code === "number" ? e.code : null
  const raw = str(e.message) ?? ""
  if (code === 190 || code === 102) return { ok: false, kind: "NEEDS_ACTION", code: "TOKEN_EXPIRED", message: `Kết nối ${label} đã hết hạn — kết nối lại để tiếp tục đăng` }
  if (code === 10 || (code !== null && code >= 200 && code < 300)) return { ok: false, kind: "NEEDS_ACTION", code: "PERMISSION", message: `${label} chưa cấp quyền đăng bài cho ứng dụng — kết nối lại và đồng ý quyền đăng` }
  if (code === 4 || code === 17 || code === 32 || code === 613) return { ok: false, kind: "RETRYABLE", code: "RATE_LIMIT", message: `${label} tạm giới hạn số lượt — hệ thống sẽ thử lại` }
  if (code === 9007 || code === 2207027) return { ok: false, kind: "RETRYABLE", code: "MEDIA_NOT_READY", message: `${label} đang xử lý ảnh — hệ thống sẽ thử lại` }
  if (code === 368) return { ok: false, kind: "NEEDS_ACTION", code: "BLOCKED", message: `${label} tạm chặn đăng bài vì nghi ngờ spam — kiểm tra Trang rồi thử lại` }
  return { ok: false, kind: "NEEDS_ACTION", code: code !== null ? `GRAPH_${code}` : `HTTP_${r.status}`, message: `${label} từ chối bài: ${raw || "lỗi không rõ"}` }
}

const form = (fields: Record<string, string>) => ({
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(fields).toString(),
})

const failed = (r: JsonResponse) => r.status !== 200 || "error" in r.body

export function createFacebookPublisher(fetchImpl: FetchLike = fetch): PublisherProvider {
  const call = (path: string, fields: Record<string, string>) => callJson(fetchImpl, "meta-graph", `${GRAPH}/${path}`, form(fields))
  return {
    channel: "facebook",
    async publish(req: PublishRequest, cred: ChannelCredential): Promise<PublishResult> {
      const token = cred.accessToken
      try {
        let r: JsonResponse
        if (req.imageUrls.length === 0) {
          r = await call(`${cred.accountId}/feed`, { message: req.caption, access_token: token })
        } else if (req.imageUrls.length === 1) {
          // Một lời gọi mang cả chữ và ảnh — không thể tách thành 2 bài (bài học của SocialFlow)
          r = await call(`${cred.accountId}/photos`, { url: req.imageUrls[0]!, caption: req.caption, published: "true", access_token: token })
        } else {
          const ids: string[] = []
          for (const url of req.imageUrls) {
            const up = await call(`${cred.accountId}/photos`, { url, published: "false", access_token: token })
            if (failed(up)) return classifyGraphError(up, "Facebook")
            const id = str(up.body.id)
            if (id) ids.push(id)
          }
          const fields: Record<string, string> = { message: req.caption, access_token: token }
          ids.forEach((id, i) => { fields[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }) })
          r = await call(`${cred.accountId}/feed`, fields)
        }
        if (failed(r)) return classifyGraphError(r, "Facebook")
        const postId = str(r.body.post_id) ?? str(r.body.id)
        if (!postId) return { ok: false, kind: "RETRYABLE", code: "NO_POST_ID", message: "Facebook chưa trả mã bài — hệ thống sẽ kiểm tra lại" }
        return { ok: true, externalId: postId, url: `https://www.facebook.com/${postId}` }
      } catch (e) {
        return transientFailure(e, "Facebook")
      }
    },
  }
}

export function createInstagramPublisher(fetchImpl: FetchLike = fetch): PublisherProvider {
  const post = (path: string, fields: Record<string, string>) => callJson(fetchImpl, "meta-graph", `${GRAPH}/${path}`, form(fields))
  return {
    channel: "instagram",
    async publish(req: PublishRequest, cred: ChannelCredential): Promise<PublishResult> {
      const token = cred.accessToken
      const ig = cred.accountId
      try {
        let containerId: string | null
        if (req.imageUrls.length === 1) {
          const c = await post(`${ig}/media`, { image_url: req.imageUrls[0]!, caption: req.caption, access_token: token })
          if (failed(c)) return classifyGraphError(c, "Instagram")
          containerId = str(c.body.id)
        } else {
          const children: string[] = []
          for (const url of req.imageUrls) {
            const c = await post(`${ig}/media`, { image_url: url, is_carousel_item: "true", access_token: token })
            if (failed(c)) return classifyGraphError(c, "Instagram")
            const id = str(c.body.id)
            if (id) children.push(id)
          }
          const c = await post(`${ig}/media`, { media_type: "CAROUSEL", children: children.join(","), caption: req.caption, access_token: token })
          if (failed(c)) return classifyGraphError(c, "Instagram")
          containerId = str(c.body.id)
        }
        if (!containerId) return { ok: false, kind: "RETRYABLE", code: "NO_CONTAINER", message: "Instagram chưa nhận ảnh — hệ thống sẽ thử lại" }
        const pub = await post(`${ig}/media_publish`, { creation_id: containerId, access_token: token })
        if (failed(pub)) return classifyGraphError(pub, "Instagram")
        const mediaId = str(pub.body.id)
        if (!mediaId) return { ok: false, kind: "RETRYABLE", code: "NO_POST_ID", message: "Instagram chưa trả mã bài — hệ thống sẽ kiểm tra lại" }
        // Link bài: hỏi thêm một lần, hỏng thì bỏ qua (bài đã lên rồi)
        const link = await callJson(fetchImpl, "meta-graph", `${GRAPH}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(token)}`, { method: "GET" }).catch(() => null)
        return { ok: true, externalId: mediaId, url: link ? str(link.body.permalink) : null }
      } catch (e) {
        return transientFailure(e, "Instagram")
      }
    },
  }
}
