import { createHmac, timingSafeEqual } from "node:crypto"

import { env } from "@/lib/env"

/**
 * Ký URL tạm cho route `/api/v1/storage/[...key]` (HMAC theo key + hạn dùng
 * + phương thức). Khoá: `STORAGE_SIGNING_SECRET`, thiếu thì lùi về
 * `SESSION_SECRET` (SDAGF D-07 — xoay khoá kho độc lập với khoá phiên).
 *
 * Chữ ký `PUT` khác chữ ký `GET`: URL xem đã ký (kể cả URL nằm trên catalog
 * công khai) không dùng được để ghi đè tệp (audit SDAGF-007/014). Chuỗi ký
 * của `GET` giữ nguyên dạng cũ `key:exp`.
 */
export type StorageUrlMethod = "GET" | "PUT"

function signaturePayload(key: string, expiresAt: number, method: StorageUrlMethod): string {
  return method === "PUT" ? `PUT:${key}:${expiresAt}` : `${key}:${expiresAt}`
}

function signingSecret(): string {
  return env.STORAGE_SIGNING_SECRET ?? env.SESSION_SECRET
}

export function signStorageUrl(key: string, expiresAt: number, method: StorageUrlMethod = "GET"): string {
  return createHmac("sha256", signingSecret()).update(signaturePayload(key, expiresAt, method)).digest("hex")
}

export function verifyStorageSignature(
  key: string,
  expiresAt: number,
  signature: string,
  method: StorageUrlMethod = "GET"
): boolean {
  if (Date.now() > expiresAt) return false
  const expected = Buffer.from(signStorageUrl(key, expiresAt, method))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}
