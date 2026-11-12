import type { DeliveryWindow } from "./order-types"
import type { PendingOrderEvent } from "./repositories/order-repository.interface"

/** "2026-11-14 14:00 - 16:00" — giá trị ghi vào lịch sử đơn (trục `delivery_window`). */
export function formatDeliveryWindowValue(window: DeliveryWindow | null | undefined): string {
  if (!window?.date) return ""
  return [window.date, window.timeSlot?.trim()].filter(Boolean).join(" ")
}

/**
 * Sự kiện lịch sử khi giờ giao đổi: giá trị cũ, mới, người đổi, lý do (checklist ALG 4.6). Không đổi → `null`.
 * Pure TypeScript.
 */
export function deliveryWindowChangeEvent(
  before: DeliveryWindow | null | undefined,
  after: DeliveryWindow | null | undefined,
  actorId: string | null,
  reason: string
): PendingOrderEvent | null {
  const from = formatDeliveryWindowValue(before)
  const to = formatDeliveryWindowValue(after)
  if (!to || from === to) return null
  return { axis: "delivery_window", fromValue: from || null, toValue: to, actorId, reason }
}
