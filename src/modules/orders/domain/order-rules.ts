/**
 * Pure domain rules for M10 — Orders & Operations.
 * Zero Prisma imports, pure business invariants testable in-memory.
 */

import type {
  OrderStatus,
  ProductionStatus,
  DeliveryStatus,
  OrderItemInput,
  OrderEventRecord,
  OrderSlaCalculation,
} from "./order-types"
import { vnCalendarDate } from "@/lib/vn-date"
import { DELIVERY_STATUS_LABELS, ORDER_STATUS_LABELS, PRODUCTION_STATUS_LABELS } from "./order-status-labels"

const VALID_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["DELIVERED", "COMPLETED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "PROCESSING"], // có thể trả về nếu có sự cố
  COMPLETED: [],
  CANCELLED: [],
}

const VALID_PRODUCTION_TRANSITIONS: Record<ProductionStatus, readonly ProductionStatus[]> = {
  WAITING: ["ASSIGNED", "ARRANGING"],
  ASSIGNED: ["ARRANGING", "WAITING"],
  ARRANGING: ["QUALITY_CHECK", "READY", "ASSIGNED"],
  QUALITY_CHECK: ["READY", "ARRANGING"],
  READY: ["ARRANGING"],
}

const VALID_DELIVERY_TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  PENDING: ["DISPATCHED", "DELIVERING"],
  // DISPATCHED → DELIVERED: Điều phối ghi đã giao ngay khi có bằng chứng POD, không bắt qua DELIVERING (audit BL-03)
  DISPATCHED: ["DELIVERING", "DELIVERED", "PENDING"],
  DELIVERING: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  FAILED: ["DELIVERING", "PENDING"],
}

/**
 * Trạng thái đơn KHÔNG được đặt tay qua sổ đơn (`PATCH /orders/:id`) — audit BL-01 (06/11/2026).
 * Xác nhận là hệ quả của tiền về / duyệt giao trước; hoàn tất cần đã giao + thu đủ (ALG 4.26);
 * huỷ cần quyền huỷ (R6) và lý do. Mỗi trạng thái có lối riêng mang đủ luật đó.
 */
const MANUAL_STATUS_BLOCKED: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "Đơn tự được xác nhận khi ghi nhận tiền hoặc khi được duyệt giao trước, thu sau.",
  COMPLETED: "Đơn chỉ hoàn tất ở màn Điều phối, sau khi đã giao và đã thu đủ tiền.",
  CANCELLED: "Huỷ đơn bằng nút Huỷ đơn và nêu lý do.",
}

/** Lý do chặn khi người dùng tự đặt `next` cho trạng thái đơn ở sổ đơn, hoặc `null` nếu được phép. */
export function manualStatusBlockReason(next: OrderStatus): string | null {
  return MANUAL_STATUS_BLOCKED[next] ?? null
}

/** Kiểm tra luồng trạng thái đơn hàng */
export function validateOrderStatusTransition(
  current: OrderStatus,
  next: OrderStatus
): { valid: boolean; reason?: string } {
  if (current === next) return { valid: true }
  const allowed = VALID_ORDER_TRANSITIONS[current] ?? []
  if (!allowed.includes(next)) {
    return {
      valid: false,
      reason: `Không thể chuyển đơn từ "${ORDER_STATUS_LABELS[current] ?? current}" sang "${ORDER_STATUS_LABELS[next] ?? next}". Bước được phép: ${allowed.map((s) => ORDER_STATUS_LABELS[s]).join(", ") || "không còn (đơn đã kết thúc)"}.`,
    }
  }
  return { valid: true }
}

/** Kiểm tra luồng trạng thái sản xuất / chế tác */
export function validateProductionStatusTransition(
  current: ProductionStatus,
  next: ProductionStatus
): { valid: boolean; reason?: string } {
  if (current === next) return { valid: true }
  const allowed = VALID_PRODUCTION_TRANSITIONS[current] ?? []
  if (!allowed.includes(next)) {
    return {
      valid: false,
      reason: `Không thể chuyển tiến độ làm hàng từ "${PRODUCTION_STATUS_LABELS[current] ?? current}" sang "${PRODUCTION_STATUS_LABELS[next] ?? next}". Bước được phép: ${allowed.map((s) => PRODUCTION_STATUS_LABELS[s]).join(", ")}.`,
    }
  }
  return { valid: true }
}

/** Kiểm tra luồng trạng thái giao hàng */
export function validateDeliveryStatusTransition(
  current: DeliveryStatus,
  next: DeliveryStatus
): { valid: boolean; reason?: string } {
  if (current === next) return { valid: true }
  const allowed = VALID_DELIVERY_TRANSITIONS[current] ?? []
  if (!allowed.includes(next)) {
    return {
      valid: false,
      reason: `Không thể chuyển tiến độ giao hàng từ "${DELIVERY_STATUS_LABELS[current] ?? current}" sang "${DELIVERY_STATUS_LABELS[next] ?? next}". Bước được phép: ${allowed.map((s) => DELIVERY_STATUS_LABELS[s]).join(", ") || "không còn"}.`,
    }
  }
  return { valid: true }
}

/** Tính tổng tiền đơn hàng từ danh sách items */
export function calculateOrderTotal(items: readonly OrderItemInput[]): number {
  if (!items || items.length === 0) return 0
  return items.reduce((sum, item) => {
    const qty = Math.max(1, Math.floor(item.quantity))
    const price = Math.max(0, item.unitPriceVnd)
    return sum + qty * price
  }, 0)
}

/**
 * Đo lường SLA từ chuỗi order_events (đặc tả 07 mục 12).
 * Không đọc cột cứng trên orders: chuỗi sự kiện là nguồn duy nhất đo SLA.
 */
export function calculateOrderSla(
  events: readonly OrderEventRecord[],
  slaTargetMinutes = 180
): OrderSlaCalculation {
  if (!events || events.length === 0) {
    return {
      totalDurationMinutes: 0,
      isSlaMet: true,
      slaTargetMinutes,
    }
  }

  const sorted = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const firstEventTime = new Date(sorted[0]!.createdAt).getTime()
  const completedOrDeliveredEvent = sorted.find(
    (e) => (e.axis === "order" && (e.toValue === "COMPLETED" || e.toValue === "DELIVERED")) ||
           (e.axis === "delivery" && e.toValue === "DELIVERED")
  )

  const endTime = completedOrDeliveredEvent
    ? new Date(completedOrDeliveredEvent.createdAt).getTime()
    : Date.now()

  const totalDurationMinutes = Math.max(0, Math.round((endTime - firstEventTime) / (1000 * 60)))

  // Đo thời gian sản xuất (từ lúc ASSIGNED/ARRANGING đến lúc READY)
  let prodStart: number | null = null
  let prodEnd: number | null = null

  for (const ev of sorted) {
    if (ev.axis === "production") {
      if (ev.toValue === "ARRANGING" && prodStart === null) {
        prodStart = new Date(ev.createdAt).getTime()
      }
      if (ev.toValue === "READY") {
        prodEnd = new Date(ev.createdAt).getTime()
      }
    }
  }

  const productionDurationMinutes =
    prodStart !== null && prodEnd !== null
      ? Math.max(0, Math.round((prodEnd - prodStart) / (1000 * 60)))
      : undefined

  return {
    totalDurationMinutes,
    productionDurationMinutes,
    isSlaMet: totalDurationMinutes <= slaTargetMinutes,
    slaTargetMinutes,
  }
}

/**
 * Sinh mã đơn hàng chuẩn FloraOS dạng `DHYYMMDD-XXXX`, ngày theo giờ Việt Nam (audit BL-10).
 */
export function generateOrderCode(seqNumber: number, date = new Date()): string {
  const vn = vnCalendarDate(date)
  const yy = String(vn.year).slice(-2)
  const mm = String(vn.month).padStart(2, "0")
  const dd = String(vn.day).padStart(2, "0")
  const suffix = String(seqNumber).padStart(4, "0")
  return `DH${yy}${mm}${dd}-${suffix}`
}

/**
 * Đơn đến từ Thẻ chào (`source = BROCHURE`) có luật riêng: chính sách thu tiền, thứ tự xưởng,
 * trả mã giảm giá khi huỷ, báo khách qua Zalo/SMS. Sửa ở sổ đơn chung sẽ bỏ qua các luật đó —
 * trả lý do chặn (tiếng Việt) hoặc `null`.
 */
export function brochureLockReason(order: { source?: string | null | undefined }): string | null {
  return order.source === "BROCHURE"
    ? "Đơn này đến từ Thẻ chào — vui lòng cập nhật ở trang Thẻ chào để giữ đúng luật thu tiền và báo khách."
    : null
}
