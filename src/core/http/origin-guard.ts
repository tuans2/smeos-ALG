import { LEGACY_SESSION_COOKIES, LEGACY_SSO_COOKIES, readCookie, SESSION_COOKIE, SSO_COOKIE } from "./cookies"
import { AppError } from "./errors"

/**
 * Chặn request ghi gửi từ origin khác (ARC-022, quyết định PO D-25 "kiểm Origin", kế hoạch 11/11/2026).
 *
 * Cookie phiên đã `SameSite=Lax` nên trang của site lạ không gửi kèm cookie khi POST; phần còn hở là trang CÙNG SITE
 * khác origin (tên miền con khác của cùng tên miền gốc) và đăng nhập giả (login CSRF — chưa có cookie nên `SameSite`
 * không giúp gì). Luật cho lệnh ghi (`POST/PUT/PATCH/DELETE`) có cookie phiên, và cho các route đăng nhập/đăng ký:
 *
 * - `Origin` trùng host của chính request (gồm tên miền riêng của tiệm) hoặc `PUBLIC_APP_URL`/`NEXT_PUBLIC_APP_URL` → qua;
 * - không có `Origin`: `Sec-Fetch-Site` là `same-origin` hoặc `none` (người dùng tự gõ/đánh dấu) → qua;
 * - thiếu cả hai → qua: trình duyệt hiện hành luôn gửi ít nhất một trong hai, nên đây là máy gọi máy (vd. backend
 *   LocalBudd/SocialFlow gọi `sso/refresh`) — không phải đường của CSRF;
 * - còn lại → 403 `CROSS_ORIGIN_REJECTED`.
 *
 * Chế độ (`ORIGIN_CHECK_MODE`): `enforce` chặn; `log` chỉ ghi `security.cross_origin_request` rồi cho qua. Mặc định
 * production là `log` để theo dõi một tuần trước khi chặn (PO 11/11/2026, Q4) — đổi biến môi trường thành `enforce`
 * trên Render để bật chặn; ngoài production mặc định `enforce` để lỗi lộ ra ngay khi phát triển và test.
 */
export type OriginCheckMode = "enforce" | "log"

type Env = Readonly<Record<string, string | undefined>>

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"])

/**
 * Đường dẫn dưới đây ghi TƯƠNG ĐỐI sau `/api/v1/`: bộ dò phạm vi bàn giao (`scripts/release/trace-imports.ts`) đọc chuỗi
 * `/api/...` trong mã như một liên kết tới route và sẽ kéo route đó vào bản giao.
 */
const API_V1 = "/api/v1"

/** Đăng nhập/đăng ký/dùng thử: kiểm cả khi chưa có cookie (login CSRF). */
export const AUTH_ENTRY_PATHS: readonly string[] = ["auth/login", "auth/signup", "auth/instant-trial"]

/**
 * Tiền tố (sau `/api/v1/`) miễn kiểm — xác thực KHÔNG dựa vào cookie phiên của trình duyệt. Danh sách chỉ được thu hẹp; thêm mục phải
 * ghi lý do (`tests/unit/core/http/origin-guard.test.ts` khoá danh sách).
 */
export const ORIGIN_CHECK_EXEMPT_PREFIXES: Readonly<Record<string, string>> = {
  "public/": "trang khách và webhook công khai — không dùng phiên, có giới hạn tần suất theo IP",
  "integration/": "máy gọi máy bằng Bearer token / JWT SSO trong header",
  "internal/": "cron nội bộ, gác bằng `x-cron-secret`",
  "storage/": "URL ký sẵn (`verifyStorageSignature`)",
  "chat/webhooks/": "webhook Facebook/Zalo, xác thực bằng chữ ký",
  "billing/sepay": "webhook SePay, gác bằng khoá API",
}

export function originCheckMode(env: Env = process.env): OriginCheckMode {
  const raw = env.ORIGIN_CHECK_MODE?.trim().toLowerCase()
  if (raw === "enforce" || raw === "log") return raw
  return env.NODE_ENV === "production" ? "log" : "enforce"
}

function hostOf(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).host.toLowerCase()
  } catch {
    return null
  }
}

function requestHosts(request: Request, env: Env): Set<string> {
  const hosts = new Set<string>()
  const add = (h: string | null | undefined) => {
    if (h) hosts.add(h.trim().toLowerCase())
  }
  // Sau proxy của Render, `host` có thể là địa chỉ nội bộ — host khách truy cập nằm ở `x-forwarded-host`
  add(request.headers.get("x-forwarded-host")?.split(",")[0])
  add(request.headers.get("host"))
  add(hostOf(request.url))
  add(hostOf(env.PUBLIC_APP_URL))
  add(hostOf(env.NEXT_PUBLIC_APP_URL))
  return hosts
}

/** Request này có phải đối tượng kiểm không (lệnh ghi + cookie phiên, hoặc route đăng nhập), sau miễn trừ. */
export function needsOriginCheck(request: Request, pathname: string): boolean {
  if (!MUTATING.has(request.method.toUpperCase())) return false
  const relative = pathname.startsWith(`${API_V1}/`) ? pathname.slice(API_V1.length + 1) : null
  if (relative !== null && Object.keys(ORIGIN_CHECK_EXEMPT_PREFIXES).some((prefix) => relative.startsWith(prefix))) return false
  if (relative !== null && AUTH_ENTRY_PATHS.includes(relative)) return true
  return [SESSION_COOKIE, SSO_COOKIE, ...LEGACY_SESSION_COOKIES, ...LEGACY_SSO_COOKIES].some((name) => readCookie(request, name) !== null)
}

/** `null` khi hợp lệ; ngược lại là lý do (để ghi log). */
export function crossOriginReason(request: Request, env: Env = process.env): string | null {
  const origin = request.headers.get("origin")
  if (origin && origin !== "null") {
    const host = hostOf(origin)
    return host && requestHosts(request, env).has(host) ? null : "origin_mismatch"
  }
  if (origin === "null") return "origin_null"
  const site = request.headers.get("sec-fetch-site")?.toLowerCase()
  if (!site || site === "same-origin" || site === "none") return null
  return `sec_fetch_site_${site}`
}

/**
 * Gọi từ `handle()` trước handler. `enforce` → ném 403; `log` → gọi `onLog` rồi cho qua.
 */
export function guardCrossOrigin(
  request: Request,
  pathname: string,
  onLog: (event: { reason: string; method: string; path: string; mode: OriginCheckMode }) => void,
  env: Env = process.env
): void {
  if (!needsOriginCheck(request, pathname)) return
  const reason = crossOriginReason(request, env)
  if (!reason) return
  const mode = originCheckMode(env)
  onLog({ reason, method: request.method.toUpperCase(), path: pathname, mode })
  if (mode === "enforce") {
    throw new AppError("CROSS_ORIGIN_REJECTED", "Yêu cầu bị từ chối vì không gửi từ trang của SMEOS. Vui lòng tải lại trang rồi thử lại.")
  }
}
