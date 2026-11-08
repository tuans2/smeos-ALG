/**
 * Kết nối Facebook Page (+ Instagram Business gắn với Page) qua Facebook Login (Bước 4, PO 08/11/2026). Đổi mã → token
 * người dùng dài hạn → danh sách Page kèm Page token (Page token lấy từ token dài hạn thì không hết hạn). Quyền xin:
 * đăng bài lên Page và Instagram — cần Meta duyệt ứng dụng (App Review) trước khi mở cho cửa hàng thật.
 */
import { callJson, obj, str, type FetchLike } from "../http-call"
import { GRAPH_VERSION } from "../meta-graph-publisher"
import type { AppCredentials } from "./app-config"

export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "business_management",
  "instagram_basic",
  "instagram_content_publish",
] as const

const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`

export function metaAuthorizeUrl(app: AppCredentials, redirectUri: string, state: string): string {
  const q = new URLSearchParams({ client_id: app.id, redirect_uri: redirectUri, state, response_type: "code", scope: META_SCOPES.join(",") })
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${q.toString()}`
}

export interface MetaPage {
  readonly id: string
  readonly name: string
  readonly accessToken: string
  readonly instagramId: string | null
  readonly instagramUsername: string | null
}

/** Mã → token dài hạn → các Page người dùng quản lý. Lỗi → ném Error câu tiếng Việt (không chứa khoá). */
export async function metaPagesFromCode(app: AppCredentials, code: string, redirectUri: string, fetchImpl: FetchLike = fetch): Promise<MetaPage[]> {
  const get = (path: string, q: Record<string, string>) => callJson(fetchImpl, "meta-graph", `${GRAPH}/${path}?${new URLSearchParams(q).toString()}`, { method: "GET" })
  const short = await get("oauth/access_token", { client_id: app.id, client_secret: app.secret, redirect_uri: redirectUri, code })
  const shortToken = str(short.body.access_token)
  if (!shortToken) throw new Error("Facebook chưa cấp quyền — thử kết nối lại")
  const long = await get("oauth/access_token", { grant_type: "fb_exchange_token", client_id: app.id, client_secret: app.secret, fb_exchange_token: shortToken })
  const userToken = str(long.body.access_token) ?? shortToken
  const pages = await get("me/accounts", { fields: "id,name,access_token,instagram_business_account{id,username}", limit: "50", access_token: userToken })
  const data = Array.isArray(pages.body.data) ? pages.body.data : []
  return data.flatMap((raw) => {
    const p = obj(raw)
    const id = str(p.id), name = str(p.name), token = str(p.access_token)
    if (!id || !name || !token) return []
    const ig = obj(p.instagram_business_account)
    return [{ id, name, accessToken: token, instagramId: str(ig.id), instagramUsername: str(ig.username) }]
  })
}
