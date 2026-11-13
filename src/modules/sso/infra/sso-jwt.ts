import { createHmac, timingSafeEqual } from "node:crypto"

import { env } from "@/lib/env"

import { isSsoClaimsExpired, type SsoClaims } from "../domain/sso-claims"

/**
 * JWT HS256 viết tay — không thêm thư viện. Cùng lựa chọn của
 * `session-token.ts`/`token-crypto.ts` (chỉ dùng `node:crypto`), khác ở chỗ
 * đây PHẢI đúng khuôn JWT chuẩn (`header.payload.signature`, base64url, HMAC
 * SHA-256) vì `LocalBudd` (Node) và `SocialFlow` (Python) xác minh nó bằng
 * thư viện JWT tiêu chuẩn của họ (`jsonwebtoken`/`jose`, `PyJWT`), không đọc
 * được một định dạng token tự chế riêng của floraos-core.
 */
const HEADER = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url")
}

function sign(headerAndPayload: string): string {
  return createHmac("sha256", env.SSO_SESSION_SECRET).update(headerAndPayload).digest("base64url")
}

export function signSsoToken(claims: SsoClaims): string {
  const payload = base64url(JSON.stringify(claims))
  const signature = sign(`${HEADER}.${payload}`)
  return `${HEADER}.${payload}.${signature}`
}

/**
 * `null` cho MỌI hình thức không hợp lệ — chữ ký sai, hình dạng sai, JSON
 * hỏng, hay hết hạn — không phân biệt lý do ra ngoài, giống
 * `resolveSession()` không phân biệt "không có token" với "token sai".
 */
export function verifySsoToken(token: string, now: Date): SsoClaims | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts
  if (header === undefined || payload === undefined || signature === undefined) return null
  if (header !== HEADER) return null

  const expected = sign(`${header}.${payload}`)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  let claims: SsoClaims
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"))
  } catch {
    return null
  }
  if (typeof claims.sub !== "string" || typeof claims.exp !== "number") return null
  if (isSsoClaimsExpired(claims, now)) return null

  return claims
}
