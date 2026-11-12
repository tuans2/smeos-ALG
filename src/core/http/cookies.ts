/**
 * Cookie phiên (`YC-S1`): `HttpOnly`, `Secure`, `SameSite=Lax`.
 *
 * Đọc và ghi cookie ở đây thay vì qua `next/headers` để route handler vẫn là
 * một hàm thuần của `Request` — nhờ vậy bộ test cách ly tenant gọi thẳng
 * được handler, không cần dựng máy chủ.
 */
export const SESSION_COOKIE = "alg_session"
/**
 * Tên trước khi đổi thương hiệu ALG (12/11/2026). Vẫn đọc để người đang đăng nhập không bị đăng xuất;
 * cookie cũ tự hết hạn, lần đăng nhập sau ghi tên mới.
 */
export const LEGACY_SESSION_COOKIES = ["smeos_session"] as const

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie")
  if (!header) return null

  for (const part of header.split(";")) {
    const index = part.indexOf("=")
    if (index === -1) continue
    if (part.slice(0, index).trim() !== name) continue
    return decodeURIComponent(part.slice(index + 1).trim())
  }
  return null
}

/** Token phiên: cookie tên mới, không có thì cookie tên cũ. */
export function readSessionCookie(request: Request): string | null {
  return readCookie(request, SESSION_COOKIE) ?? LEGACY_SESSION_COOKIES.map((n) => readCookie(request, n)).find((v) => v) ?? null
}

export function serializeSessionCookie(token: string, maxAgeSeconds: number): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (process.env.NODE_ENV === "production") parts.push("Secure")
  return parts.join("; ")
}

export function serializeClearedSessionCookie(): string {
  return serializeSessionCookie("", 0)
}

/**
 * Cookie JWT phiên liên-app (Unified Shell, B1) cho ALG
 */
export const SSO_COOKIE = "alg_sso"
/** Tên trước khi đổi thương hiệu: `smeos_sso` (đến 12/11/2026), `floraos_sso` (e9833b1) — LocalBudd/SocialFlow còn đọc/gửi. */
export const LEGACY_SSO_COOKIES = ["smeos_sso", "floraos_sso"] as const

export function readSsoCookie(request: Request): string | null {
  return readCookie(request, SSO_COOKIE) ?? LEGACY_SSO_COOKIES.map((n) => readCookie(request, n)).find((v) => v) ?? null
}

export function serializeSsoCookie(token: string, maxAgeSeconds: number): string {
  const parts = [
    `${SSO_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (process.env.NODE_ENV === "production") parts.push("Secure")
  return parts.join("; ")
}

export function serializeClearedSsoCookie(): string {
  return serializeSsoCookie("", 0)
}

/** Xoá cookie tên cũ khi đăng xuất, để phiên cũ không còn được đọc dự phòng. */
export function serializeClearedLegacyCookies(): string[] {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  return [...LEGACY_SESSION_COOKIES, ...LEGACY_SSO_COOKIES].map(
    (name) => `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  )
}
