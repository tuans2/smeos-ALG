/**
 * Chính sách gỡ endpoint (PO 07/11/2026, audit API-14, chuẩn API Contract v1.1 §8).
 *
 * - Thay đổi phá vỡ không làm tại chỗ trong `/v1`: dựng endpoint mới song song, khai endpoint cũ ở đây.
 * - Endpoint đã khai: `handle()` gắn `Deprecation: @<unix>` (ngày báo), `Sunset: <HTTP-date>` (ngày gỡ),
 *   `Link: <successor>; rel="successor-version"` cho MỌI phản hồi, kể cả lỗi.
 * - Báo trước tối thiểu: 90 ngày cho bề mặt bên ngoài (`/integration/*` — LocalBudd/SocialFlow/đối tác,
 *   `/public/*` — trang khách, webhook nhà cung cấp), 30 ngày cho API chỉ giao diện SMEOS gọi.
 * - Quá ngày gỡ mà route còn → `tests/unit/core/http/deprecation.test.ts` đỏ: gỡ route hoặc dời ngày
 *   (dời cũng phải đủ mức báo trước tính từ ngày báo mới).
 */
export type DeprecationAudience = "external" | "internal"

export type Deprecation = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  /** Đường dẫn như thư mục route: `/api/v1/orders/[id]/assign`. */
  path: string
  /** Ngày công bố (YYYY-MM-DD, UTC) — ghi vào đặc tả 06 cùng ngày. */
  announced: string
  /** Ngày gỡ (YYYY-MM-DD, UTC). */
  sunset: string
  /** Endpoint thay thế, nếu có. */
  successor?: string
  reason: string
}

export const NOTICE_DAYS: Record<DeprecationAudience, number> = { external: 90, internal: 30 }

/** Endpoint đang chờ gỡ. Trống — chưa endpoint nào được khai. */
export const DEPRECATIONS: readonly Deprecation[] = []

const EXTERNAL_PREFIXES = ["/api/v1/integration/", "/api/v1/public/"]

/** Bề mặt của một đường dẫn — suy từ tiền tố, không khai tay, để không ai hạ mức báo trước. */
export function audienceOf(path: string): DeprecationAudience {
  return EXTERNAL_PREFIXES.some((prefix) => path.startsWith(prefix)) ? "external" : "internal"
}

const DAY_MS = 24 * 60 * 60 * 1000
const dayStart = (date: string) => Date.parse(`${date}T00:00:00Z`)

/** Số ngày báo trước của một mục (ngày gỡ − ngày báo). */
export function noticeDays(entry: Deprecation): number {
  return Math.round((dayStart(entry.sunset) - dayStart(entry.announced)) / DAY_MS)
}

/** Đường dẫn kiểu thư mục route (`/a/[id]/b`, `[...rest]`) → RegExp khớp pathname thật. */
export function pathPattern(path: string): RegExp {
  const escaped = path
    .split("/")
    .map((segment) => (/^\[\.\.\.\w+\]$/.test(segment) ? ".+" : /^\[\w+\]$/.test(segment) ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/")
  return new RegExp(`^${escaped}/?$`)
}

export function deprecationFor(
  method: string,
  pathname: string,
  registry: readonly Deprecation[] = DEPRECATIONS
): Deprecation | undefined {
  return registry.find((entry) => entry.method === method.toUpperCase() && pathPattern(entry.path).test(pathname))
}

export function deprecationHeaders(entry: Deprecation): Record<string, string> {
  return {
    Deprecation: `@${Math.floor(dayStart(entry.announced) / 1000)}`,
    Sunset: new Date(dayStart(entry.sunset)).toUTCString(),
    ...(entry.successor ? { Link: `<${entry.successor}>; rel="successor-version"` } : {}),
  }
}

/** Gắn header gỡ endpoint (không làm gì nếu endpoint không nằm trong registry). */
export function withDeprecationHeaders(
  response: Response,
  method: string,
  pathname: string,
  registry: readonly Deprecation[] = DEPRECATIONS
): Response {
  const entry = deprecationFor(method, pathname, registry)
  if (!entry) return response
  try {
    for (const [name, value] of Object.entries(deprecationHeaders(entry))) response.headers.set(name, value)
  } catch {
    // Header bất biến (vd. `Response.redirect`) — giữ nguyên phản hồi
  }
  return response
}
