/**
 * Bộ quy tắc nghiệp vụ cho tính năng "Dùng ở đâu?" (Asset Usage).
 *
 * SSOT: `03_KE_HOACH_TRIEN_KHAI.md` mục PR-2 (2.2).
 * 1. Phân phối CTA hợp lệ theo Nơi dùng (UsageDestination):
 *    - PROMOTION (Quảng bá): cấm ORDER / PAY.
 *    - SALES (Bán hàng): hỗ trợ REQUEST_QUOTE / ORDER / PAY.
 *    - CARE (Chăm sóc): ưu tiên REVIEW / CONTACT / REFER.
 *    - PRINT (In ấn): hỗ trợ QR / CTA đa dạng.
 * 2. Kiểm tra Nơi dùng hợp lệ theo Loại tư liệu (Asset Type).
 * 3. Bảng trạng thái tích hợp kênh (Tự động / Thủ công / Chưa hỗ trợ).
 */

import type { UsageDestination } from "./asset-type"
import { getAssetTypeByCode } from "./asset-types"
import type { CtaCode } from "./cta-registry"

/**
 * Danh sách CTA được phép cho từng nơi dùng.
 */
export const ALLOWED_CTAS_BY_DESTINATION: Readonly<Record<UsageDestination, readonly CtaCode[]>> = {
  PROMOTION: ["LEARN_MORE", "CONTACT", "REQUEST_INFO", "REFER", "REVIEW"],
  SALES: ["REQUEST_QUOTE", "ORDER", "PAY", "CONTACT", "LEARN_MORE"],
  CARE: ["REVIEW", "CONTACT", "REFER", "LEARN_MORE", "REQUEST_INFO"],
  PRINT: ["LEARN_MORE", "CONTACT", "REQUEST_INFO", "REQUEST_QUOTE", "ORDER", "PAY", "REVIEW", "REFER"],
  LIBRARY: [],
}

/**
 * Kiểm tra xem một mã CTA có hợp lệ cho nơi dùng cụ thể không.
 */
export function isCtaAllowedForDestination(cta: CtaCode, destination: UsageDestination): boolean {
  const allowed = ALLOWED_CTAS_BY_DESTINATION[destination] ?? []
  return allowed.includes(cta)
}

/**
 * Lấy danh sách CTA hợp lệ cho một nơi dùng.
 */
export function getAvailableCtasForDestination(destination: UsageDestination): readonly CtaCode[] {
  return ALLOWED_CTAS_BY_DESTINATION[destination] ?? []
}

/**
 * Kiểm tra nơi dùng có được hỗ trợ bởi loại asset không.
 */
export function isDestinationAllowedForAsset(assetCode: string, destination: UsageDestination): boolean {
  const assetDef = getAssetTypeByCode(assetCode)
  if (!assetDef) return false
  return assetDef.destinations.includes(destination)
}

/**
 * Mức độ tự động hoá của kênh phân phối.
 */
export type ChannelAutomationLevel = "AUTOMATED" | "MANUAL" | "UNSUPPORTED"

export interface UsageChannelDefinition {
  readonly id: string
  readonly name: string
  readonly automationLevel: ChannelAutomationLevel
  readonly description: string
  readonly instructions: string
}

export const USAGE_CHANNELS: readonly UsageChannelDefinition[] = [
  {
    id: "WEB_LINK",
    name: "Liên kết Web rút gọn",
    automationLevel: "AUTOMATED",
    description: "Sinh đường dẫn rút gọn gắn mã chiến dịch và theo dõi lượt truy cập tự động.",
    instructions: "Hệ thống tự động kích hoạt link và tính lead quy thuộc.",
  },
  {
    id: "QR_CODE",
    name: "Mã QR in ấn / quầy",
    automationLevel: "AUTOMATED",
    description: "Tạo ảnh mã QR có nhãn vị trí đặt (tại bàn, quầy thu ngân, danh thiếp...).",
    instructions: "Tải ảnh mã QR để in hoặc dán tại cửa hàng.",
  },
  {
    id: "ZALO_OA",
    name: "Tin nhắn Zalo",
    automationLevel: "MANUAL",
    description: "Gửi link qua Zalo cá nhân hoặc Zalo Official Account.",
    instructions: "Sao chép liên kết hoặc quét mã để gửi thủ công cho khách hàng qua ứng dụng Zalo.",
  },
  {
    id: "SMS",
    name: "Tin nhắn SMS",
    automationLevel: "MANUAL",
    description: "Chưa tích hợp cổng SMS trực tiếp.",
    instructions: "Sao chép nội dung và đường dẫn rút gọn để gửi qua máy điện thoại hoặc nhà mạng.",
  },
  {
    id: "FACEBOOK_CHAT",
    name: "Messenger / Facebook",
    automationLevel: "MANUAL",
    description: "Gửi vào hộp thư chat fanpage hoặc tin nhắn Messenger.",
    instructions: "Dán liên kết vào khung chat khách hàng.",
  },
  {
    id: "TIKTOK_DIRECT",
    name: "TikTok Shop Direct API",
    automationLevel: "UNSUPPORTED",
    description: "Chưa hỗ trợ kết nối trực tiếp cổng mở TikTok Shop.",
    instructions: "Chức năng đang trong lộ trình phát triển.",
  },
]

export function getChannelDefinition(channelId: string): UsageChannelDefinition | undefined {
  return USAGE_CHANNELS.find((c) => c.id === channelId)
}
