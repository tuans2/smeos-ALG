import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

import { env } from "@/lib/env"

/**
 * Token phiên: giá trị ngẫu nhiên gửi cho trình duyệt, còn cơ sở dữ liệu chỉ
 * giữ HMAC của nó. Lộ bảng `sessions` một mình không đủ để mạo danh phiên,
 * vì khoá ký nằm ở biến môi trường chứ không nằm trong bảng nào (`YC-S2`).
 */
export function newSessionToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashSessionToken(token: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(token).digest("hex")
}

export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
