/**
 * Chính sách khung chat AI trên các trang công khai do công cụ ALG tạo ra
 * (catalog, landing page, hồ sơ cửa hàng, link bán hàng, danh thiếp...).
 * Thuần — không Prisma, không mạng.
 */
import type { ChannelConfig, SupportedChatChannel } from "./channel-integration-types"

export const PUBLIC_CHAT_SURFACES = [
  "catalog",
  "landing_page",
  "store_profile",
  "sales_link",
  "greeting_catalog",
  "business_card",
] as const

export type PublicChatSurface = (typeof PUBLIC_CHAT_SURFACES)[number]

export function isPublicChatSurface(value: unknown): value is PublicChatSurface {
  return typeof value === "string" && (PUBLIC_CHAT_SURFACES as readonly string[]).includes(value)
}

/** Kênh tính phí/ghi hội thoại theo trang đang hiện khung chat. */
export function surfaceChannel(surface: PublicChatSurface): SupportedChatChannel {
  return surface === "landing_page" ? "LANDING_PAGE" : "STOREFRONT_CATALOG"
}

/** Tiệm chưa cấu hình kênh: kênh miễn phí bật sẵn, kênh khác tắt. */
export function isChannelEnabledByDefault(channel: SupportedChatChannel): boolean {
  return channel === "STOREFRONT_CATALOG" || channel === "INTERNAL_DASHBOARD"
}

/** Không khai báo `publicSurfaces` = cho phép mọi trang (mặc định bật sẵn). */
export function isSurfaceAllowed(config: ChannelConfig | null | undefined, surface: PublicChatSurface): boolean {
  const list = config?.publicSurfaces
  return list === undefined || list.includes(surface)
}

export interface PublicChatLimits {
  readonly perVisitor: number
  readonly perIp: number
  readonly windowMs: number
}

export const PUBLIC_CHAT_WINDOW_MS = 10 * 60_000
export const DEFAULT_PUBLIC_CHAT_LIMITS: PublicChatLimits = {
  perVisitor: 20,
  perIp: 60,
  windowMs: PUBLIC_CHAT_WINDOW_MS,
}
/** Trần cứng — kể cả hạn mức đã duyệt cũng không vượt. */
export const PUBLIC_CHAT_LIMIT_CEILING = { perVisitor: 200, perIp: 600 } as const

function clamp(value: unknown, fallback: number, max: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? Math.min(value, max) : fallback
}

/** Hạn mức mặc định, hoặc hạn mức đã được nền tảng phê duyệt (có `approvedAt`). */
export function resolvePublicChatLimits(config: ChannelConfig | null | undefined): PublicChatLimits {
  const approved = config?.publicChatLimits
  if (!approved?.approvedAt) return DEFAULT_PUBLIC_CHAT_LIMITS
  return {
    perVisitor: clamp(approved.perVisitor, DEFAULT_PUBLIC_CHAT_LIMITS.perVisitor, PUBLIC_CHAT_LIMIT_CEILING.perVisitor),
    perIp: clamp(approved.perIp, DEFAULT_PUBLIC_CHAT_LIMITS.perIp, PUBLIC_CHAT_LIMIT_CEILING.perIp),
    windowMs: PUBLIC_CHAT_WINDOW_MS,
  }
}

/** Các loại trang tính vào một kênh. */
export function surfacesOfChannel(channel: SupportedChatChannel): PublicChatSurface[] {
  return PUBLIC_CHAT_SURFACES.filter((s) => surfaceChannel(s) === channel)
}

/** Danh sách `publicSurfaces` mới của kênh sau khi bật/tắt một loại trang. */
export function toggleSurface(
  config: ChannelConfig | null | undefined,
  surface: PublicChatSurface,
  enabled: boolean,
): PublicChatSurface[] {
  const own = surfacesOfChannel(surfaceChannel(surface))
  const current = own.filter((s) => isSurfaceAllowed(config, s))
  const next = enabled ? [...new Set([...current, surface])] : current.filter((s) => s !== surface)
  return own.filter((s) => next.includes(s))
}
