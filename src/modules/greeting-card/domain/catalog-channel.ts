/** Kênh chia sẻ link bộ sưu tập (`?kenh=`) và phễu theo kênh — thuần, không phụ thuộc hạ tầng. */

export const CATALOG_CHANNELS = [
  { code: "zalo", label: "Zalo" },
  { code: "facebook", label: "Facebook" },
  { code: "instagram", label: "Instagram" },
  { code: "tiktok", label: "TikTok" },
  { code: "website", label: "Website" },
  { code: "khac", label: "Khác" },
] as const

export const DIRECT_CHANNEL = "truc-tiep"
export const CATALOG_EVENT_TYPES = ["VIEW", "DETAIL", "FORM_OPEN", "ORDER", "LIKE", "UNLIKE"] as const
/** Thả/bỏ tim — không thuộc phễu kênh, chỉ dùng cho bảng "mẫu nhiều tim nhất". */
export const HEART_EVENT_TYPES = ["LIKE", "UNLIKE"] as const
export type CatalogEventType = (typeof CATALOG_EVENT_TYPES)[number]

/** Kênh lạ/trống → "truc-tiep": không để khách tự đặt nhãn tuỳ ý vào thống kê. */
export function normalizeChannel(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : ""
  return CATALOG_CHANNELS.some((c) => c.code === value) ? value : DIRECT_CHANNEL
}

export function channelLabel(code: string): string {
  return CATALOG_CHANNELS.find((c) => c.code === code)?.label ?? "Trực tiếp"
}

/** Gắn `?kenh=` vào link chia sẻ; không chọn kênh → giữ link gốc. */
export function withChannel(url: string, channel: string | null): string {
  if (!channel || normalizeChannel(channel) === DIRECT_CHANNEL) return url
  return `${url}${url.includes("?") ? "&" : "?"}kenh=${channel}`
}

export interface ChannelCount {
  channel: string
  eventType: CatalogEventType
  visitors: number
}

export interface ChannelFunnelRow {
  channel: string
  label: string
  views: number
  details: number
  formOpens: number
  orders: number
  orderRate: number
}

/** Gom số khách (không trùng) theo kênh × bước; sắp kênh nhiều lượt xem lên đầu. */
export function buildChannelFunnel(counts: ChannelCount[]): ChannelFunnelRow[] {
  const rows = new Map<string, ChannelFunnelRow>()
  for (const c of counts) {
    const row = rows.get(c.channel) ?? {
      channel: c.channel, label: channelLabel(c.channel), views: 0, details: 0, formOpens: 0, orders: 0, orderRate: 0,
    }
    if (c.eventType === "VIEW") row.views += c.visitors
    else if (c.eventType === "DETAIL") row.details += c.visitors
    else if (c.eventType === "FORM_OPEN") row.formOpens += c.visitors
    else if (c.eventType === "ORDER") row.orders += c.visitors
    rows.set(c.channel, row)
  }
  return [...rows.values()]
    .map((r) => ({ ...r, orderRate: r.views > 0 ? Math.round((r.orders / r.views) * 100) : 0 }))
    .sort((a, b) => b.views - a.views || a.channel.localeCompare(b.channel))
}
