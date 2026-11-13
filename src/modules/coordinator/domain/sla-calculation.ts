/**
 * ĐP-4a.2 (26/09/2026), Đặc tả trường §2.15.2 — tính `deliveryTargetAt` từ
 * HÀNH VI thật của giá trị `serviceLevel` đã chọn (đọc từ
 * `field_catalog_values.behavior`/`params`, KHÔNG suy từ mã `serviceLevel`
 * trực tiếp — quản trị nền tảng có thể thêm giá trị serviceLevel MỚI dùng
 * lại một trong 4 hành vi có sẵn, D12). Tệp thuần — không import Prisma,
 * test được không cần DB. Tham số mặc định lấy từ `behaviors.ts` khi
 * `params` không có hoặc thiếu khoá.
 */

import { SLA_BEHAVIORS } from "@/modules/field-platform/domain/behaviors"

export interface ComputeDeliveryTargetInput {
  /** `field_catalog_values.behavior` của serviceLevel đã chọn — null nếu không chọn hoặc danh mục chưa gắn hành vi. */
  behavior: string | null
  /** `field_catalog_values.params` — null thì dùng mặc định ở `behaviors.ts`. */
  params: Record<string, unknown> | null
  /** Lúc chốt đơn (dùng cho OFFSET — "giao nhanh" tính từ lúc này). */
  orderCreatedAt: Date
  /**
   * Giờ hẹn Sales nhập tay ở T01. EXACT dùng ĐÚNG giá trị này làm mốc;
   * WINDOW/END_OF_DAY dùng làm mốc dự phòng khi thiếu khung giờ riêng
   * (`deliveryWindowStart`/`End` — T01 hiện CHƯA có ô nhập riêng cho khung
   * giờ, xem TRANG_THAI.md).
   */
  requestedDeliveryAt: Date | null
  deliveryWindowStart: Date | null
  deliveryWindowEnd: Date | null
}

function numberParam(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

// `SLA_BEHAVIORS[...].defaultParams` là `Record<string, number>` — với
// `noUncheckedIndexedAccess` bật, chỉ mục ra `number | undefined`; `?? `
// đây chỉ để thoả kiểu, giá trị luôn có thật (khai trong `behaviors.ts`).
const DEFAULT_OFFSET_MINUTES = SLA_BEHAVIORS.OFFSET.defaultParams.offsetMinutes ?? 120
const DEFAULT_CLOSING_HOUR = SLA_BEHAVIORS.END_OF_DAY.defaultParams.closingHour ?? 21

/**
 * Không nhận diện được hành vi (bỏ trống `serviceLevel`, hoặc danh mục MỞ/
 * ĐÓNG không gắn hành vi SLA nào) → giữ nguyên hành vi TRƯỚC ĐP-4a.2: dùng
 * đúng giờ hẹn Sales nhập tay, không suy đoán gì thêm.
 */
export function computeDeliveryTargetAt(input: ComputeDeliveryTargetInput): Date | null {
  switch (input.behavior) {
    case "OFFSET": {
      const minutes = numberParam(input.params?.offsetMinutes, DEFAULT_OFFSET_MINUTES)
      return new Date(input.orderCreatedAt.getTime() + minutes * 60_000)
    }
    case "EXACT":
      return input.requestedDeliveryAt
    case "WINDOW":
      return input.deliveryWindowEnd ?? input.requestedDeliveryAt
    case "END_OF_DAY": {
      const closingHour = numberParam(input.params?.closingHour, DEFAULT_CLOSING_HOUR)
      const base = input.requestedDeliveryAt ?? input.orderCreatedAt
      const target = new Date(base)
      target.setHours(closingHour, 0, 0, 0)
      return target
    }
    default:
      return input.requestedDeliveryAt
  }
}
