/**
 * Trần số đơn Thẻ chào cho từng khung giờ giao (PO 08/10/2026): Điều hành chỉnh trong Cài đặt giao
 * hàng (`brochure_shipping.slot_capacity`), mặc định 100 đơn/khung. Đơn hẹn "giờ cụ thể" tính vào
 * khung 2 tiếng chứa giờ đó; đơn không chọn khung ("Trong ngày") không tính vào khung nào.
 * Pure TypeScript.
 */
import { DELIVERY_SLOTS, isCustomTimeSlot, parseCustomTime, parseSlotStartHour } from "./delivery-schedule"

export const DEFAULT_SLOT_CAPACITY = 100
export const MAX_SLOT_CAPACITY = 10_000

export interface SlotCapacityConfig {
  /** Trần chung cho mọi khung chưa đặt riêng. */
  defaultMax: number
  /** Trần riêng theo id khung (`08-10`, `10-12`…). */
  perSlot: Record<string, number>
}

function validCap(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_SLOT_CAPACITY ? value : null
}

/** Đọc `slot_capacity` đã lưu; thiếu/sai → mặc định 100 cho mọi khung. */
export function parseSlotCapacity(raw: unknown): SlotCapacityConfig {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const perRaw = r.per_slot && typeof r.per_slot === "object" ? (r.per_slot as Record<string, unknown>) : {}
  const perSlot: Record<string, number> = {}
  for (const s of DELIVERY_SLOTS) {
    const v = validCap(perRaw[s.id])
    if (v !== null) perSlot[s.id] = v
  }
  return { defaultMax: validCap(r.default) ?? DEFAULT_SLOT_CAPACITY, perSlot }
}

export function capacityOf(cfg: SlotCapacityConfig | undefined, slotId: string): number {
  return cfg?.perSlot[slotId] ?? cfg?.defaultMax ?? DEFAULT_SLOT_CAPACITY
}

/** Khung 2 tiếng của một giá trị khung giờ đã lưu (nhãn khung hoặc "Giờ cụ thể: HH:MM"); `null` = không thuộc khung nào. */
export function slotIdOfTimeSlot(timeSlot: string | null | undefined): string | null {
  const value = timeSlot?.trim()
  if (!value) return null
  if (isCustomTimeSlot(value)) {
    const hour = parseCustomTime(value)
    if (hour === null) return null
    const first = DELIVERY_SLOTS[0]!
    const last = DELIVERY_SLOTS[DELIVERY_SLOTS.length - 1]!
    if (hour < first.startHour) return first.id
    if (hour >= last.endHour) return last.id
    return DELIVERY_SLOTS.find((s) => hour >= s.startHour && hour < s.endHour)?.id ?? null
  }
  const exact = DELIVERY_SLOTS.find((s) => s.label === value)
  if (exact) return exact.id

  const startHour = parseSlotStartHour(value)
  if (startHour !== null) {
    const first = DELIVERY_SLOTS[0]!
    const last = DELIVERY_SLOTS[DELIVERY_SLOTS.length - 1]!
    if (startHour < first.startHour) return first.id
    if (startHour >= last.endHour) return last.id
    return DELIVERY_SLOTS.find((s) => startHour >= s.startHour && startHour < s.endHour)?.id ?? null
  }

  return null
}

/** Đếm đơn theo khung từ danh sách khung giờ đã lưu của các đơn cùng ngày. */
export function countBySlot(timeSlots: ReadonlyArray<string | null | undefined>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const t of timeSlots) {
    const id = slotIdOfTimeSlot(t)
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

/** Nhãn các khung đã đủ đơn (để trang khách hiện "đã kín"). */
export function fullSlotLabels(counts: ReadonlyMap<string, number>, cfg: SlotCapacityConfig | undefined): string[] {
  return DELIVERY_SLOTS.filter((s) => (counts.get(s.id) ?? 0) >= capacityOf(cfg, s.id)).map((s) => s.label)
}

export function slotFullMessage(timeSlot: string): string {
  const id = slotIdOfTimeSlot(timeSlot)
  const label = DELIVERY_SLOTS.find((s) => s.id === id)?.label ?? timeSlot
  return `Khung giờ ${label} của ngày này đã đủ đơn. Vui lòng chọn khung giờ hoặc ngày khác.`
}
