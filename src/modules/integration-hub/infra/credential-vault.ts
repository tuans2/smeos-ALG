/**
 * Kho bí mật của kết nối: mỗi đầu nối một `purpose` secret-box riêng — lộ bản mã của
 * đầu nối này không giải được đầu nối khác. Chỉ use-case được gọi `openCredential`.
 */

import { openSecret, sealSecret } from "@/core/security/secret-box"

const purposeOf = (connectorKey: string) => `integration:${connectorKey}`

export function sealCredential(connectorKey: string, secret: string): { encrypted: string; hint: string } {
  return { encrypted: sealSecret(secret, purposeOf(connectorKey)), hint: secret.slice(-4) }
}

export function openCredential(connectorKey: string, encrypted: string): string {
  return openSecret(encrypted, purposeOf(connectorKey))
}
