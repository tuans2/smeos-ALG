import { openSecret, sealSecret } from "@/core/security/secret-box"
import { PlatformSecretRepository } from "@/modules/greeting-card/infra/platform-secret-repository"
import type { ProviderChannel, ProviderConfig } from "../domain/channel-providers"

/**
 * Cấu hình nhà cung cấp kênh cấp nền tảng (checklist 4.30): mỗi kênh một dòng `platform_secrets`, cả bản
 * niêm phong bằng secret-box (gồm khoá API). Không thuộc tổ chức nào — đăng ký một lần, mọi tổ chức dùng chung.
 */
const PURPOSE = "notification-channel-provider"

export const providerSecretKey = (channel: ProviderChannel) => `notification_provider:${channel}`

function open(sealed: string | null): ProviderConfig | null {
  if (!sealed) return null
  const parsed = JSON.parse(openSecret(sealed, PURPOSE)) as Partial<ProviderConfig>
  return typeof parsed.provider === "string" && parsed.values && typeof parsed.values === "object"
    ? { provider: parsed.provider, values: parsed.values as Record<string, string> }
    : null
}

const seal = (config: ProviderConfig) => sealSecret(JSON.stringify(config), PURPOSE)

export interface IChannelProviderStore {
  get(channel: ProviderChannel): Promise<ProviderConfig | null>
  save(channel: ProviderChannel, config: ProviderConfig | null): Promise<void>
  /** Đọc-ghi dưới khoá dòng (refresh token Zalo dùng một lần). */
  withLock<T>(channel: ProviderChannel, fn: (current: ProviderConfig | null, save: (next: ProviderConfig) => Promise<void>) => Promise<T>): Promise<T>
}

export class ChannelProviderStore implements IChannelProviderStore {
  constructor(private readonly repo = new PlatformSecretRepository()) {}

  async get(channel: ProviderChannel): Promise<ProviderConfig | null> {
    return open(await this.repo.get(providerSecretKey(channel)))
  }

  /** `null` = gỡ nhà cung cấp (kênh quay về chưa cấu hình). */
  save(channel: ProviderChannel, config: ProviderConfig | null): Promise<void> {
    return this.repo.withLock(providerSecretKey(channel), (_current, write) => write(config ? seal(config) : ""))
  }

  withLock<T>(channel: ProviderChannel, fn: (current: ProviderConfig | null, save: (next: ProviderConfig) => Promise<void>) => Promise<T>): Promise<T> {
    return this.repo.withLock(providerSecretKey(channel), (current, write) => fn(open(current), (next) => write(seal(next))))
  }
}
