/**
 * Domain: CRM Care Scripts (CRM-10, CRM-11)
 * Sinh kịch bản chăm sóc khách hàng tự động theo dịp kỷ niệm và phân tầng RFM.
 * Thuần túy logic, không import Prisma hay thư viện ngoài.
 */

import type { OccasionReminder } from "./customer-master-index"
import type { CustomerTier } from "./customer-master-index"

export type CareChannelType = "ZALO" | "PHONE_CALL" | "SMS"

export interface CareScriptContext {
  reminder: OccasionReminder
  shopName: string
  hotline?: string | undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// GỢI Ý HOA THEO DỊP (CRM-12)
// ─────────────────────────────────────────────────────────────────────────────

const OCCASION_FLOWER_SUGGESTIONS: Record<string, string> = {
  "sinh nhật": "Hoa hồng hoặc hướng dương rực rỡ",
  "kỷ niệm ngày cưới": "Hoa hồng đỏ hoặc ly trắng lãng mạn",
  "kỷ niệm": "Hoa hồng nhung đỏ hoặc tulip ngọt ngào",
  "ngày của mẹ": "Hoa cúc trắng hoặc cẩm chướng hồng nhẹ nhàng",
  "ngày của cha": "Hoa lan hoặc hướng dương ấm áp",
  "tốt nghiệp": "Hoa hướng dương tươi vui hoặc đồng tiền rực rỡ",
  "khai trương": "Cây mai vàng hoặc bình hoa phong thủy may mắn",
  "8/3": "Hoa hồng đỏ hoặc tulip pastel ngọt ngào",
  "20/10": "Hoa hồng hoặc cúc tana phong cách Hàn",
  "valentine": "Hoa hồng đỏ cổ điển hoặc sản phẩm ngọt ngào",
}

/**
 * Gợi ý sản phẩm phù hợp theo dịp và sở thích (CRM-12).
 */
export function suggestFlowerForOccasion(
  occasionName: string,
  preferredFlower: string | null
): string {
  if (preferredFlower) {
    return `${preferredFlower} (theo sở thích của khách)`
  }
  const key = Object.keys(OCCASION_FLOWER_SUGGESTIONS).find((k) =>
    occasionName.toLowerCase().includes(k)
  )
  const found = key ? OCCASION_FLOWER_SUGGESTIONS[key] : undefined
  return found ?? "Hoa theo mùa tươi đẹp"
}

// ─────────────────────────────────────────────────────────────────────────────
// SINH KỊCH BẢN ZALO CHĂM SÓC (CRM-11)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sinh kịch bản Zalo chăm sóc ngày kỷ niệm tự động (CRM-11).
 * Khác biệt theo độ khẩn cấp (daysLeft) và phân tầng VIP.
 */
export function generateOccasionCareScript(
  ctx: CareScriptContext,
  tier: CustomerTier
): string {
  const { reminder, shopName, hotline } = ctx
  const flower = suggestFlowerForOccasion(reminder.occasionName, reminder.suggestedFlower)
  const recipientLabel = reminder.recipientName !== reminder.customerName
    ? ` cho ${reminder.recipientName}`
    : ""

  const greeting = tier === "VIP" || tier === "GOLD"
    ? `Chào anh/chị ${reminder.customerName} 🌸 — khách hàng thân thiết của ${shopName}!`
    : `Xin chào anh/chị ${reminder.customerName} 🌸`

  const urgencyNote = reminder.daysLeft === 0
    ? "Hôm nay là ngày đặc biệt rồi! "
    : reminder.daysLeft <= 3
    ? `Chỉ còn ${reminder.daysLeft} ngày nữa! `
    : `Còn ${reminder.daysLeft} ngày đến ngày ${reminder.occasionName}. `

  const vipExtra = (tier === "VIP" || tier === "GOLD")
    ? `\n\n💎 Với tư cách khách hàng thân thiết, anh/chị sẽ được ưu tiên tư vấn chọn mẫu và đặt trước để đảm bảo sản phẩm nhất ngày đó ạ.`
    : ""

  const ctaLine = hotline
    ? `\n📞 Gọi ngay ${hotline} hoặc nhắn tin để đặt hàng trước nha anh/chị!`
    : `\n📞 Nhắn tin lại để ${shopName} tư vấn và đặt hàng trước nha anh/chị!`

  return [
    greeting,
    "",
    `${urgencyNote}${shopName} muốn gợi ý anh/chị tặng **${flower}**${recipientLabel} nhân dịp ${reminder.occasionName} ạ 🌺`,
    "",
    `✅ Sản phẩm cắt buổi sáng sớm`,
    `✅ Thiết kế theo yêu cầu & gói hộp đẹp`,
    `✅ Giao tận nơi đúng giờ`,
    vipExtra,
    ctaLine,
    "",
    `💐 ${shopName}`,
  ].filter((l) => l !== undefined).join("\n")
}

// ─────────────────────────────────────────────────────────────────────────────
// PHÂN LOẠI ĐỘ KHẨN CẤP (CRM-08, CRM-09)
// ─────────────────────────────────────────────────────────────────────────────

export type ReminderUrgency = "TODAY" | "URGENT" | "SOON" | "UPCOMING"

/**
 * Phân loại độ khẩn cấp của nhắc hẹn (CRM-08, CRM-09).
 */
export function classifyReminderUrgency(daysLeft: number): ReminderUrgency {
  if (daysLeft === 0) return "TODAY"
  if (daysLeft <= 3) return "URGENT"
  if (daysLeft <= 7) return "SOON"
  return "UPCOMING"
}

export const URGENCY_CONFIG: Record<ReminderUrgency, { label: string; colorClass: string; badgeClass: string }> = {
  TODAY: {
    label: "Hôm nay!",
    colorClass: "border-danger/40 bg-danger-bg",
    badgeClass: "bg-danger text-white",
  },
  URGENT: {
    label: "Khẩn cấp",
    colorClass: "border-warning/40 bg-warning-bg",
    badgeClass: "bg-warning text-text",
  },
  SOON: {
    label: "Sắp đến",
    colorClass: "border-primary/30 bg-primary/5",
    badgeClass: "bg-primary text-white",
  },
  UPCOMING: {
    label: "Sắp tới",
    colorClass: "border-border bg-surface",
    badgeClass: "bg-surface-alt text-text",
  },
}
