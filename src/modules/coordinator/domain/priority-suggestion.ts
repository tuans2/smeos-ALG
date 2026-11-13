/**
 * ĐP-4a.1 (26/09/2026), Đặc tả trường §2.15.1 — GỢI Ý mức ưu tiên xử lý nội
 * bộ từ `serviceLevel`, `orderType` và hạng khách. Đây chỉ là GỢI Ý — Sales
 * chọn tay ở T01 thì giá trị đó thắng tuyệt đối, hàm này chỉ điền sẵn khi
 * Sales bỏ trống. Tệp thuần — không import Prisma, test được không cần DB.
 *
 * Luật theo đúng bảng §2.15.1:
 * - CRITICAL: giờ cố định không lùi được — đơn hẹn đúng giờ (`EXACT_TIME`)
 *   thuộc nhóm có giờ cố định thật sự quan trọng (tang lễ, khai trương, sự
 *   kiện/cưới — SYMPATHY/GRAND_OPENING/WEDDING_EVENT).
 * - URGENT: `serviceLevel = EXPRESS` (giao nhanh, còn ít thời gian).
 * - HIGH: khách hạng GOLD/VIP.
 * - NORMAL: mặc định.
 * (§2.15.1 còn nói "hoặc đơn đang bị leo thang" cho CRITICAL — không suy
 * được lúc TẠO đơn, vì leo thang chỉ phát sinh sau khi đơn đã chạy; áp dụng
 * ở `evaluateRisk`/luồng exception, không ở hàm gợi ý lúc tạo này.)
 */

export type PriorityCode = "NORMAL" | "HIGH" | "URGENT" | "CRITICAL"

export interface SuggestPriorityInput {
  readonly serviceLevel?: string | null | undefined
  readonly orderType?: string | null | undefined
  readonly customerTier?: string | null | undefined
}

/** orderType có giờ cố định không lùi được khi đi cùng `serviceLevel = EXACT_TIME`. */
const FIXED_TIME_ORDER_TYPES = new Set(["SYMPATHY", "GRAND_OPENING", "WEDDING_EVENT"])

export function suggestPriority(input: SuggestPriorityInput): PriorityCode {
  if (input.serviceLevel === "EXACT_TIME" && input.orderType && FIXED_TIME_ORDER_TYPES.has(input.orderType)) {
    return "CRITICAL"
  }
  if (input.serviceLevel === "EXPRESS") return "URGENT"
  if (input.customerTier === "GOLD" || input.customerTier === "VIP") return "HIGH"
  return "NORMAL"
}
