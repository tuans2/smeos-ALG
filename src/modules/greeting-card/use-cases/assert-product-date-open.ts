/**
 * Chặn đặt mẫu vào ngày cửa hàng đã khoá (checklist ALG 2.8) — kiểm ở máy chủ khi khách gửi đơn,
 * không chỉ dựa vào màn hình. Áp cho mọi chế độ khả dụng.
 */

import { validationFailed } from "@/core/http/errors"
import { AvailabilityCheckRepository } from "../infra/availability-check-repository"
import { isManuallyBlocked, parseAvailabilityConfig } from "../domain/product-availability-config"

export const BLOCKED_DATE_MESSAGE = "Mẫu này không nhận đơn giao ngày đã chọn — vui lòng chọn ngày khác hoặc mẫu khác"

export async function assertProductDateOpen(
  organizationId: string,
  productId: string,
  deliveryDate: string | undefined,
  repo = new AvailabilityCheckRepository()
): Promise<void> {
  const date = deliveryDate?.trim()
  if (!date) return
  const product = await repo.findProduct(organizationId, productId)
  if (!product) return
  if (isManuallyBlocked(date, parseAvailabilityConfig(product.availability_config))) {
    throw validationFailed({ deliveryDate: BLOCKED_DATE_MESSAGE })
  }
}
