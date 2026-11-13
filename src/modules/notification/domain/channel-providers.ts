/**
 * Sổ nhà cung cấp kênh liên lạc cấp nền tảng (checklist 4.30).
 *
 * Mỗi kênh ngoài (SMS, Zalo, Web Push) đăng ký nhà cung cấp MỘT lần ở tầng Mẹ; mọi tổ chức dùng chung.
 * Bật/tắt việc dùng kênh vẫn qua kích hoạt kênh toàn sàn (`notification_channel_activations`) và chính sách
 * 4 tầng (`cascading-policy.ts`). Thiếu cấu hình → adapter trả `NOT_CONFIGURED`, không báo đã gửi.
 *
 * Luật thuần — không I/O.
 */
export type ProviderChannel = "SMS" | "ZALO" | "PUSH"

export const PROVIDER_CHANNELS: readonly ProviderChannel[] = ["SMS", "ZALO", "PUSH"]

export interface ProviderField {
  name: string
  label: string
  /** Bí mật: chỉ ghi, không bao giờ trả lại nguyên văn. */
  secret: boolean
  required: boolean
}

export interface ProviderDefinition {
  key: string
  channel: ProviderChannel
  label: string
  fields: readonly ProviderField[]
  /** Kênh gửi được ngay khi đủ cấu hình; `false` = còn thiếu phần khác của hệ thống (ghi rõ ở `pending`). */
  ready: boolean
  pending?: string
}

const field = (name: string, label: string, secret: boolean, required = true): ProviderField => ({ name, label, secret, required })

export const CHANNEL_PROVIDERS: readonly ProviderDefinition[] = [
  {
    key: "esms",
    channel: "SMS",
    label: "eSMS.vn — SMS Brandname",
    fields: [field("apiKey", "API key", true), field("secretKey", "Secret key", true), field("brandname", "Brandname đã đăng ký", false)],
    ready: true,
  },
  {
    key: "zalo_zns",
    channel: "ZALO",
    label: "Zalo ZNS — tin theo mẫu đã duyệt",
    fields: [
      field("appId", "App ID", false),
      field("secretKey", "Secret key của ứng dụng", true),
      field("accessToken", "Access token OA", true),
      field("refreshToken", "Refresh token OA", true),
      field("templateId", "Mã mẫu ZNS dùng chung cho thông báo", false),
      field("titleParam", "Tên tham số tiêu đề trong mẫu (mặc định title)", false, false),
      field("messageParam", "Tên tham số nội dung trong mẫu (mặc định message)", false, false),
    ],
    ready: true,
  },
  {
    key: "vapid",
    channel: "PUSH",
    label: "Web Push (VAPID)",
    fields: [
      field("subject", "Liên hệ của hệ thống (mailto: hoặc https:)", false),
      field("publicKey", "Khoá công khai VAPID — để trống, hệ thống tự tạo", false),
      field("privateKey", "Khoá riêng VAPID — để trống, hệ thống tự tạo", true),
    ],
    ready: true,
  },
]

export interface ProviderConfig {
  provider: string
  values: Record<string, string>
}

export function providerDefinition(channel: ProviderChannel, providerKey: string): ProviderDefinition | null {
  return CHANNEL_PROVIDERS.find((p) => p.channel === channel && p.key === providerKey) ?? null
}

export function isProviderChannel(value: string): value is ProviderChannel {
  return (PROVIDER_CHANNELS as readonly string[]).includes(value)
}

/**
 * Gộp cấu hình gửi lên với bản đang lưu: ô bí mật để trống = giữ giá trị cũ (người dùng không phải nhập lại
 * khoá mỗi lần sửa ô khác). Ô thường để trống = xoá. Trả lỗi theo tên trường nếu thiếu ô bắt buộc.
 */
export function mergeProviderConfig(
  def: ProviderDefinition,
  incoming: Record<string, string | undefined>,
  current: ProviderConfig | null,
): { config: ProviderConfig } | { errors: Record<string, string> } {
  const keep = current?.provider === def.key ? current.values : {}
  const values: Record<string, string> = {}
  const errors: Record<string, string> = {}
  for (const f of def.fields) {
    const raw = (incoming[f.name] ?? "").trim()
    const value = raw || (f.secret ? keep[f.name] ?? "" : "")
    if (value) values[f.name] = value
    else if (f.required) errors[f.name] = `Thiếu ${f.label}`
  }
  return Object.keys(errors).length ? { errors } : { config: { provider: def.key, values } }
}

export interface MaskedProviderConfig {
  channel: ProviderChannel
  provider: string | null
  /** Ô thường trả nguyên văn; ô bí mật chỉ cho biết đã có hay chưa. */
  values: Record<string, string>
  secretsSet: Record<string, boolean>
  configured: boolean
  ready: boolean
  pending: string | null
}

export function maskProviderConfig(channel: ProviderChannel, config: ProviderConfig | null): MaskedProviderConfig {
  const def = config ? providerDefinition(channel, config.provider) : null
  // Chưa chọn nhà cung cấp: khả năng gửi của kênh lấy theo nhà cung cấp đầu tiên trong sổ
  const shown = def ?? CHANNEL_PROVIDERS.find((p) => p.channel === channel) ?? null
  const values: Record<string, string> = {}
  const secretsSet: Record<string, boolean> = {}
  for (const f of def?.fields ?? []) {
    const v = config?.values[f.name]
    if (f.secret) secretsSet[f.name] = Boolean(v)
    else if (v) values[f.name] = v
  }
  const configured = Boolean(def && def.fields.every((f) => !f.required || config?.values[f.name]))
  return { channel, provider: def?.key ?? null, values, secretsSet, configured, ready: Boolean(shown?.ready), pending: shown?.pending ?? null }
}

/** Đủ ô bắt buộc của nhà cung cấp đang chọn. */
export function isProviderConfigured(channel: ProviderChannel, config: ProviderConfig | null): boolean {
  return maskProviderConfig(channel, config).configured
}
