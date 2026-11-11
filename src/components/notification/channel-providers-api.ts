/**
 * Dữ liệu và luật hiển thị của khối "Kênh liên lạc" ở Console tầng Mẹ (checklist 4.30).
 * API: `GET/PUT /api/v1/platform/notification/providers`, `POST …/providers/test`, bật/tắt qua
 * `PATCH /api/v1/platform/notification/channels`. Khoá bí mật không bao giờ về trình duyệt — chỉ `secretsSet`.
 */
export const PROVIDERS_URL = "/api/v1/platform/notification/providers"
export const PROVIDER_TEST_URL = "/api/v1/platform/notification/providers/test"
export const CHANNELS_URL = "/api/v1/platform/notification/channels"

export type ProviderChannelKey = "SMS" | "ZALO" | "PUSH"

export interface ProviderFieldView {
  name: string
  label: string
  secret: boolean
  required: boolean
}

export interface ProviderDefinitionView {
  key: string
  channel: ProviderChannelKey
  label: string
  fields: ProviderFieldView[]
  ready: boolean
  pending?: string
}

export interface ChannelProviderStateView {
  channel: ProviderChannelKey
  provider: string | null
  values: Record<string, string>
  secretsSet: Record<string, boolean>
  configured: boolean
  ready: boolean
  pending: string | null
  activated: boolean
}

export interface ChannelProvidersView {
  catalog: ProviderDefinitionView[]
  channels: ChannelProviderStateView[]
}

export const CHANNEL_NAMES: Record<ProviderChannelKey, string> = {
  SMS: "Tin nhắn SMS",
  ZALO: "Zalo",
  PUSH: "Thông báo trên trình duyệt",
}

export type ChannelStatusTone = "success" | "warning" | "neutral"

/** Trạng thái một kênh bằng lời: đã kết nối chưa, đang dùng hay đang tắt, gửi được chưa. */
export function channelStatus(state: ChannelProviderStateView): { label: string; tone: ChannelStatusTone } {
  if (!state.ready && state.configured) return { label: "Đã lưu khoá, chưa gửi được", tone: "warning" }
  if (!state.configured) return { label: "Chưa kết nối", tone: "neutral" }
  return state.activated ? { label: "Đang dùng", tone: "success" } : { label: "Đã kết nối, đang tắt", tone: "warning" }
}

/** Chỉ bật được kênh đã kết nối và gửi được; tắt thì luôn được. */
export function canActivate(state: ChannelProviderStateView): boolean {
  return state.activated || (state.configured && state.ready)
}

/** Thân `PUT`: ô bí mật để trống không gửi (máy chủ giữ khoá cũ). */
export function providerSaveBody(channel: ProviderChannelKey, def: ProviderDefinitionView, form: Record<string, string>) {
  const values: Record<string, string> = {}
  for (const f of def.fields) {
    const v = (form[f.name] ?? "").trim()
    if (v || !f.secret) values[f.name] = v
  }
  return { channel, provider: def.key, values }
}
