/**
 * Mã hoá trường bí mật của cấu hình kênh chat trước khi lưu Json (AES-256-GCM, secret-box).
 * Bản mã nằm trong `_sealed`; bản ghi cũ còn dạng rõ vẫn đọc được và được mã hoá ở lần ghi kế tiếp.
 */

import { openSecret, sealSecret } from "@/core/security/secret-box"
import type { ChannelConfig } from "../domain/channel-integration-types"
import { CHANNEL_SECRET_FIELDS, type ChannelSecretField } from "../domain/channel-secret-fields"

export type StoredChannelConfig = ChannelConfig & {
  _sealed?: Partial<Record<ChannelSecretField, string>>
}

const purposeOf = (field: ChannelSecretField) => `chat-channel:${field}`

export function sealChannelConfig(config: ChannelConfig): StoredChannelConfig {
  const stored: StoredChannelConfig = { ...config }
  const sealed: Partial<Record<ChannelSecretField, string>> = {}
  for (const field of CHANNEL_SECRET_FIELDS) {
    const value = config[field]
    delete stored[field]
    if (value) sealed[field] = sealSecret(value, purposeOf(field))
  }
  if (Object.keys(sealed).length > 0) stored._sealed = sealed
  else delete stored._sealed
  return stored
}

export function openChannelConfig(stored: StoredChannelConfig | null | undefined): ChannelConfig {
  if (!stored) return {}
  const { _sealed, ...rest } = stored
  const config: ChannelConfig = { ...rest }
  for (const field of CHANNEL_SECRET_FIELDS) {
    const cipher = _sealed?.[field]
    if (cipher) config[field] = openSecret(cipher, purposeOf(field))
  }
  return config
}

/** Bản ghi còn bí mật dạng rõ (chưa mã hoá) — dùng cho script di trú. */
export function hasPlaintextSecrets(stored: StoredChannelConfig | null | undefined): boolean {
  return !!stored && CHANNEL_SECRET_FIELDS.some((field) => !!stored[field])
}
