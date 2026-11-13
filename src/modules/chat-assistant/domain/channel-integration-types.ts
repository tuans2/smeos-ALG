/**
 * Omnichannel AI Assistant Types (M08).
 * Quản trị đa kênh tích hợp: E-Catalog, Landing Page, Facebook Messenger, Zalo OA, Website ngoài.
 */

export type SupportedChatChannel =
  | "INTERNAL_DASHBOARD"
  | "STOREFRONT_CATALOG"
  | "LANDING_PAGE"
  | "FACEBOOK_MESSENGER"
  | "ZALO_OA"
  | "EMBEDDED_WIDGET"

export interface ChannelPricingInfo {
  readonly channel: SupportedChatChannel
  readonly name: string
  readonly description: string
  readonly isFree: boolean
  readonly monthlyCreditCost: number
  readonly messageCreditCost: number
  readonly requiresSetup: boolean
  readonly guideUrl?: string | undefined
}

export interface ChannelConfig {
  welcomeMessage?: string | undefined
  avatarUrl?: string | undefined
  botName?: string | undefined
  fbPageId?: string | undefined
  fbPageAccessToken?: string | undefined
  fbVerifyToken?: string | undefined
  zaloOaId?: string | undefined
  zaloAppId?: string | undefined
  zaloSecretKey?: string | undefined
  zaloAccessToken?: string | undefined
  zaloRefreshToken?: string | undefined
  embedAllowedOrigins?: string[] | undefined
  /** Trang công khai được hiện khung chat; không khai báo = mọi trang. */
  publicSurfaces?: string[] | undefined
  /** Hạn mức chat công khai đã được nền tảng phê duyệt nâng; chủ tiệm không tự ghi được. */
  publicChatLimits?: { perVisitor: number; perIp: number; approvedAt: string } | undefined
}

export interface ChatChannelIntegration {
  id: string
  organizationId: string
  channel: SupportedChatChannel
  isEnabled: boolean
  config: ChannelConfig
  subscriptionExpiresAt?: string | null | undefined
  createdAt: string
  updatedAt: string
}
