/**
 * Omnichannel AI Assistant Rules & Pricing Catalog (M08).
 * Quản lý chính sách định giá, chốt chặn thuê bao kênh và tính hợp lệ API credentials.
 */

import type {
  SupportedChatChannel,
  ChannelPricingInfo,
  ChannelConfig,
} from "./channel-integration-types"

export const CHANNEL_PRICING_CATALOG: Record<SupportedChatChannel, ChannelPricingInfo> = {
  INTERNAL_DASHBOARD: {
    channel: "INTERNAL_DASHBOARD",
    name: "ALG In-App Copilot",
    description: "Trợ lý nội bộ 24/7 hỗ trợ chủ shop và nhân viên thao tác toàn hệ thống",
    isFree: true,
    monthlyCreditCost: 0,
    messageCreditCost: 0,
    requiresSetup: false,
  },
  STOREFRONT_CATALOG: {
    channel: "STOREFRONT_CATALOG",
    name: "E-Catalog Trực Tuyến",
    description: "Khung chat nổi dành riêng cho khách hàng xem link e-catalog và đặt hoa online",
    isFree: true,
    monthlyCreditCost: 0,
    messageCreditCost: 1, // 1 credit / 10 tin nhắn
    requiresSetup: false,
  },
  LANDING_PAGE: {
    channel: "LANDING_PAGE",
    name: "Landing Pages Chiến Dịch",
    description: "Trợ lý ảo chốt đơn tự động gắn trên các landing page sản phẩm dịp lễ",
    isFree: true,
    monthlyCreditCost: 0,
    messageCreditCost: 1,
    requiresSetup: false,
  },
  FACEBOOK_MESSENGER: {
    channel: "FACEBOOK_MESSENGER",
    name: "Facebook Messenger Fanpage",
    description: "Tự động trả lời tin nhắn Fanpage Facebook 24/7, gửi sản phẩm kèm giá và chốt đơn",
    isFree: false,
    monthlyCreditCost: 50, // 50 credit/tháng (~150.000 đ)
    messageCreditCost: 1,
    requiresSetup: true,
    guideUrl: "https://docs.avilotusgroup.com/integrations/facebook-messenger",
  },
  ZALO_OA: {
    channel: "ZALO_OA",
    name: "Zalo Official Account (OA)",
    description: "Kết nối tài khoản Zalo Doanh Nghiệp, phản hồi tin nhắn tự động và tích hợp Zalo ZNS",
    isFree: false,
    monthlyCreditCost: 70, // 70 credit/tháng (~200.000 đ)
    messageCreditCost: 1,
    requiresSetup: true,
    guideUrl: "https://docs.avilotusgroup.com/integrations/zalo-oa",
  },
  EMBEDDED_WIDGET: {
    channel: "EMBEDDED_WIDGET",
    name: "Mã Nhúng Website Riêng (Script)",
    description: "Đoạn mã JavaScript 1 dòng nhúng khung chat vào website WordPress, Haravan, Shopify",
    isFree: false,
    monthlyCreditCost: 30, // 30 credit/tháng (~100.000 đ)
    messageCreditCost: 1,
    requiresSetup: true,
  },
}

export function getChannelPricing(channel: SupportedChatChannel): ChannelPricingInfo {
  return CHANNEL_PRICING_CATALOG[channel] ?? CHANNEL_PRICING_CATALOG.STOREFRONT_CATALOG
}

export function isChannelSubscriptionActive(
  channel: SupportedChatChannel,
  isEnabled: boolean,
  expiresAt?: Date | null
): boolean {
  if (!isEnabled) return false
  const pricing = getChannelPricing(channel)
  if (pricing.isFree) return true

  if (!expiresAt) return false
  return new Date(expiresAt).getTime() > Date.now()
}

export function canActivateChannel(
  channel: SupportedChatChannel,
  currentCreditBalance: number,
  currentExpiresAt?: Date | null
): { allowed: boolean; reason?: string; requiredCredit: number } {
  const pricing = getChannelPricing(channel)
  if (pricing.isFree) {
    return { allowed: true, requiredCredit: 0 }
  }

  // Nếu thuê bao hiện tại vẫn còn hạn thì cho phép bật/tắt tự do không trừ thêm credit
  const isCurrentlyActive = currentExpiresAt && new Date(currentExpiresAt).getTime() > Date.now()
  if (isCurrentlyActive) {
    return { allowed: true, requiredCredit: 0 }
  }

  // Cần gia hạn / mua mới gói thuê bao tháng
  const required = pricing.monthlyCreditCost
  if (currentCreditBalance < required) {
    return {
      allowed: false,
      reason: `Số dư ví không đủ để kích hoạt kênh ${pricing.name}. Cần ${required} credit, số dư hiện tại: ${currentCreditBalance} credit. Vui lòng nạp thêm credit!`,
      requiredCredit: required,
    }
  }

  return { allowed: true, requiredCredit: required }
}

export function calculateNewExpiry(currentExpiresAt?: Date | null, days: number = 30): Date {
  const now = Date.now()
  const baseTime =
    currentExpiresAt && new Date(currentExpiresAt).getTime() > now
      ? new Date(currentExpiresAt).getTime()
      : now

  return new Date(baseTime + days * 24 * 60 * 60 * 1000)
}

export function validateChannelCredentials(
  channel: SupportedChatChannel,
  config: ChannelConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (channel === "FACEBOOK_MESSENGER") {
    if (!config.fbPageId?.trim()) {
      errors.push("Chưa nhập Facebook Page ID")
    }
    if (!config.fbPageAccessToken?.trim()) {
      errors.push("Chưa nhập Facebook Page Access Token")
    }
  } else if (channel === "ZALO_OA") {
    if (!config.zaloOaId?.trim()) {
      errors.push("Chưa nhập Zalo Official Account ID")
    }
    // App ID + Secret Key bắt buộc: webhook dùng chúng để kiểm chữ ký tin nhắn đến (audit AUD-028)
    if (!config.zaloAppId?.trim()) {
      errors.push("Chưa nhập Zalo App ID")
    }
    if (!config.zaloSecretKey?.trim()) {
      errors.push("Chưa nhập Zalo Secret Key để xác thực tin nhắn đến")
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
