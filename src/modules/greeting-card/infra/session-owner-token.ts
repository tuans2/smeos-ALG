import { createHmac, timingSafeEqual } from "node:crypto"
import { env } from "@/lib/env"

/**
 * Giá trị cookie chủ phiên: HMAC(SESSION_SECRET, mã phiên). Không lưu thêm gì trong DB —
 * cookie đúng chữ ký = trình duyệt này đã được máy chủ trao quyền chủ phiên.
 */
export function signOwnerToken(sendCode: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(`brochure-owner:${sendCode.toUpperCase()}`).digest("hex")
}

export function verifyOwnerToken(sendCode: string, token: string | null | undefined): boolean {
  if (!token) return false
  const expected = Buffer.from(signOwnerToken(sendCode))
  const actual = Buffer.from(token)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
