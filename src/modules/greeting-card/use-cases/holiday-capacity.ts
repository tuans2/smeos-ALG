import { validationFailed } from "@/core/http/errors"
import { holidayCapacityError, holidayOn, parseHolidayPolicy } from "../domain/holiday-policy"
import { BrochureCheckoutRepository, getBrochureCheckoutRepository } from "../infra/brochure-checkout-repository"

/**
 * Chặn nhận thêm đơn khi ngày lễ đã đủ số đơn tối đa (mặc định 500, áp cả tiệm — PO 08/10/2026).
 * Ngày thường không giới hạn. Hai đơn gửi đúng cùng lúc có thể vượt trần một vài đơn (không khoá).
 */
export async function assertHolidayCapacity(
  organizationId: string,
  deliveryDate: string,
  shopSettings: unknown,
  options: { excludeOrderId?: string | undefined } = {},
  checkout = getBrochureCheckoutRepository(),
): Promise<void> {
  const holiday = holidayOn(deliveryDate.trim(), parseHolidayPolicy(shopSettings))
  if (!holiday) return
  const count = await checkout.countOrdersOnDeliveryDate(organizationId, deliveryDate.trim(), options.excludeOrderId)
  const error = holidayCapacityError(holiday, count)
  if (error) throw validationFailed({ deliveryDate: error })
}
