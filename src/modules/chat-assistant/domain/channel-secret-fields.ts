/**
 * Trường bí mật trong cấu hình kênh chat (token/khoá của Facebook, Zalo OA).
 * Quy tắc thuần: che khi trả về client, bỏ giá trị đã che/rỗng khi client gửi lại
 * để không ghi đè bí mật đang lưu.
 */

import type { ChannelConfig } from "./channel-integration-types"

export const CHANNEL_SECRET_FIELDS = [
  "fbPageAccessToken",
  "fbVerifyToken",
  "zaloSecretKey",
  "zaloAccessToken",
  "zaloRefreshToken",
] as const

export type ChannelSecretField = (typeof CHANNEL_SECRET_FIELDS)[number]

export const SECRET_MASK_PREFIX = "••••"

/** Chỉ giữ 4 ký tự cuối để người dùng nhận ra khoá đang dùng. */
export function maskSecret(value: string): string {
  return `${SECRET_MASK_PREFIX}${value.slice(-4)}`
}

export function maskChannelSecrets(config: ChannelConfig): ChannelConfig {
  const masked: ChannelConfig = { ...config }
  for (const field of CHANNEL_SECRET_FIELDS) {
    const value = masked[field]
    if (value) masked[field] = maskSecret(value)
  }
  return masked
}

/** Bỏ trường bí mật rỗng hoặc còn nguyên dạng đã che — nghĩa là người dùng không đổi. */
export function dropUnchangedSecrets(config: ChannelConfig): ChannelConfig {
  const cleaned: ChannelConfig = { ...config }
  for (const field of CHANNEL_SECRET_FIELDS) {
    const value = cleaned[field]
    if (value === undefined) continue
    if (!value.trim() || value.startsWith(SECRET_MASK_PREFIX)) delete cleaned[field]
  }
  return cleaned
}
