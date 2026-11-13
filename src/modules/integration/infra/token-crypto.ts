import { createHmac, randomBytes } from "node:crypto"

import { env } from "@/lib/env"

/**
 * Sinh và băm token máy gọi máy — cùng quy ước với
 * `src/modules/organization/infra/session-token.ts`: giá trị ngẫu nhiên đưa
 * cho engine ngoài, cơ sở dữ liệu chỉ giữ HMAC của nó. Khoá ký riêng
 * (`INTEGRATION_TOKEN_SECRET`, tách khỏi `SESSION_SECRET`) để xoay khoá của
 * người dùng và của engine ngoài là hai việc vận hành độc lập.
 */
export function newIntegrationToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashIntegrationToken(token: string): string {
  return createHmac("sha256", env.INTEGRATION_TOKEN_SECRET).update(token).digest("hex")
}
