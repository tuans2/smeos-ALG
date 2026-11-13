import { validationFailed } from "@/core/http/errors"
import { parseShippingConfig } from "../domain/brochure-pricing"
import { capacityOf, fullSlotLabels, slotFullMessage, slotIdOfTimeSlot } from "../domain/slot-capacity"
import { BrochureCheckoutRepository, getBrochureCheckoutRepository } from "../infra/brochure-checkout-repository"

/** Trần của khung giờ khách chọn, để giao dịch tạo đơn kiểm lại có khoá; `null` = không thuộc khung nào. */
export function slotGuardFor(shopSettings: unknown, timeSlot: string | undefined): { slotId: string; max: number } | null {
  const slotId = slotIdOfTimeSlot(timeSlot)
  return slotId ? { slotId, max: capacityOf(parseShippingConfig(shopSettings).slotCapacity, slotId) } : null
}

/** Kiểm nhanh (chưa khoá) trước khi tạo phiên ở link chung — tránh phiên mồ côi khi khung đã kín. */
export async function assertSlotOpen(
  organizationId: string,
  input: { deliveryDate: string; deliveryTimeSlot?: string | undefined },
  shopSettings: unknown,
  checkout = getBrochureCheckoutRepository()
): Promise<void> {
  const guard = slotGuardFor(shopSettings, input.deliveryTimeSlot)
  if (!guard) return
  const taken = (await checkout.countOrdersBySlot(organizationId, input.deliveryDate.trim())).get(guard.slotId) ?? 0
  if (taken >= guard.max) throw validationFailed({ deliveryTimeSlot: slotFullMessage(input.deliveryTimeSlot ?? "") })
}

/** Nhãn các khung đã đủ đơn của ngày `date` — trang khách hiện "đã kín", không cho chọn. */
export async function fullSlotsOn(
  organizationId: string,
  date: string | undefined,
  shopSettings: unknown,
  checkout = getBrochureCheckoutRepository()
): Promise<string[]> {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return []
  return fullSlotLabels(await checkout.countOrdersBySlot(organizationId, date), parseShippingConfig(shopSettings).slotCapacity)
}
