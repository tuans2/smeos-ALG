/**
 *Proxy sang engine ngoài — luật thuần, không chạm Prisma, không chạm
 * `node:crypto` (giống `token-rules.ts` cùng thư mục).
 *
 * Dashboard `floraos-core` (3100) muốn chạy một tính năng thuộc `LocalBudd`
 * (3000) hay `SocialFlow` (8000) mà KHÔNG chuyển sang UI của app đó. Ba app
 * ba cổng nên trình duyệt blocked mọi call cross-origin (CORS), và cookie
 * `floraos_session`/`floraos_sso` host-only "localhost" tự đi kèm trong cùng
 * một host nhưng KHÔNG tự đi qua cổng khác.
 *
 * Giải pháp duy nhất đúng: core làm PROXY SERVER-SIDE. Dashboard fetch
 * same-origin `/api/v1/proxy/[...path]`, core server-side gọi sibling bằng HTTP
 * server-to-server (không CORS), forward danh tính theo đúng hai cơ chế đã có
 * từ trước (Unified Shell B1/B2, P7 Integration Layer), rồi trả response về
 * cho trình duyệt.
 *
 * Hai đường danh tính forwarded:
 *   - `X-ALG-SSO: <jwt>` — thay mặt NGƯỜI DÙNG đang đăng nhập. Sibling đã
 *     có `sso_auth.py`/`sso-jwt.ts` để verify, `claims.org` là tổ chức. Dùng cho
 *     mọi tính năng theo người dùng.
 *   - `Authorization: Bearer <token>` — token MÁY GỌI MÁY (`integration_tokens`,
 *     `F9`). Gắn cứng một tổ chức, dùng cho lời gọi nền. Core không tự cấp token
 *     mới cho proxy; dashboard gửi token đã có (hoặc không cần nếu đi SSO).
 *
 * SSO thắng khi có cả hai (cùng quy ước với `integration-credential.ts`): chọn
 * cái hẹp hơn — SSO bị locked vào đúng tổ chức của người thao tác và mang theo
 * năng lực thật, trong khi token nền mở toàn bộ tổ chức đã cấp.
 */

import { AppError } from "@/core/http/errors"

export type ProxyClient = "SOCIALFLOW" | "LOCALBUDD"

/** Tên header mang JWT phiên liên-app (`alg_sso`) khi gọi server-to-server. */
export const SSO_HEADER = "x-alg-sso"
/** Tên trước khi đổi thương hiệu ALG (12/11/2026) và trước nữa — vẫn đọc, và vẫn gửi kèm cho ứng dụng liên kết chưa cập nhật. */
export const LEGACY_SSO_HEADERS = ["x-smeos-sso", "x-floraos-sso"] as const

/** Tên header core forward token máy-gọi-máy. */
export const AUTHORIZATION_HEADER = "authorization"

/** Khoảng timeout khi gọi sibling, mili-giây. Tăng lên 120s để đảm bảo đủ thời gian
 * cho các tác vụ AI suy luận cục bộ (Local LLM Qwen sinh đa kênh Facebook,
 * Instagram, TikTok, Zalo). */
export const PROXY_TIMEOUT_MS = 120_000

/** Danh sách method không forward body (GET/HEAD/DELETE). */
export const NO_BODY_METHODS: readonly string[] = ["GET", "HEAD", "DELETE"]

/** Kiểm một client được proxy có cấu hình URL chưa. */
export function requireProxyUrl(client: ProxyClient, url: string | undefined): string {
  if (!url) {
    throw new AppError(
      "INTERNAL",
      `Proxy sang ${client} chưa được cấu hình — set ${client === "SOCIALFLOW" ? "SOCIALFLOW_URL" : "LOCALBUDD_URL"} trong .env`
    )
  }
  return url
}

/** Danh sách trắng tiền tố đường dẫn theo client — không proxy linh tinh. */
export const PROXY_ALLOWED_PREFIX: Readonly<Record<ProxyClient, readonly string[]>> = {
  // `api/m07/generate` KHÔNG còn trong danh sách trắng (P27, 25/09/2026):
  // `/noi-dung` gọi thẳng `POST /api/v1/content-engine/generations`, không
  // qua proxy SocialFlow M07 nữa. `api/m07/posts` giữ lại cho luồng duyệt/
  // lịch đăng (approve, và `/schedule` sau này).
  SOCIALFLOW: ["api/m04b", "api/m07/posts", "api/posts", "api/accounts"],
  LOCALBUDD: [
    "api/v1/catalog-links",
    "api/v1/projects",
    "api/v1/generate",
    "api/v1/pages",
    "api/v1/worker/cron",
  ],
}

/** Đường dẫn (có hoặc không có `/` đầu) có nằm trong danh sách trắng của client không. */
export function isAllowedProxyPath(client: ProxyClient, path: string): boolean {
  const normalized = path.replace(/^\/+/, "")
  if (normalized.split("/").some((seg) => seg === ".." || seg === ".")) return false
  return PROXY_ALLOWED_PREFIX[client].some((prefix) => normalized === prefix || normalized.startsWith(prefix + "/"))
}

/**
 * Mã năng lực core kiểm TRƯỚC khi forward (thao tác ghi nhạy cảm). Kết nối/đăng nhập/ngắt
 * tài khoản mạng xã hội của cửa hàng (công cụ 54) cần J5 "Đăng bài lên mạng xã hội";
 * đọc danh sách thì không. `null` = không yêu cầu thêm, sibling tự kiểm theo JWT.
 */
export function proxyCapabilityFor(client: ProxyClient, method: string, path: string): string | null {
  const normalized = path.replace(/^\/+/, "")
  const isRead = method === "GET" || method === "HEAD"
  if (client === "SOCIALFLOW" && !isRead && (normalized === "api/accounts" || normalized.startsWith("api/accounts/"))) return "J5"
  return null
}
