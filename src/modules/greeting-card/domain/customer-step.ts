/**
 * Khách mở lại trang: bước đã nhớ trên máy còn được về không. Máy chủ (đơn, mẫu đã chọn) luôn
 * thắng: đã có đơn thì chỉ về thanh toán / theo dõi; chưa có đơn thì không về bước của đơn. Pure TypeScript.
 */

import type { TrackingTriggerPolicy } from "./brochure-payment-policy"

export type CustomerStep = "SWIPING" | "ORDER_FORM" | "PAYMENT" | "TRACKING"
export type PublicStep = "SWIPING" | "PREVIEW" | "ORDER_FORM" | "PAYMENT" | "TRACKING"

export interface CustomerStepFacts {
  hasOrder: boolean
  hasSnapshot: boolean
  /** `canViewTracking` — chưa chuyển khoản thì không vào Theo dõi, kể cả bằng Back/Forward hay mở lại trang. */
  trackingUnlocked: boolean
}

export function canEnterCustomerStep(target: CustomerStep, s: CustomerStepFacts): boolean {
  if (!s.hasOrder) return target === "SWIPING" || (target === "ORDER_FORM" && s.hasSnapshot)
  return target === "PAYMENT" || (target === "TRACKING" && s.trackingUnlocked)
}

/**
 * Quy trình kích hoạt mở quyền Theo dõi tiến độ đơn hàng cho khách:
 * - Nếu triggerPolicy === "PAYMENT_ONLY": Chỉ khi Điều hành xác nhận đã nhận tiền (paidVnd > 0) mới kích hoạt.
 * - Nếu triggerPolicy === "PAYMENT_OR_COORDINATOR": Điều hành xác nhận tiền HOẶC Điều phối nhận đơn đều kích hoạt.
 * Ngoại lệ: đơn đã huỷ, mẫu chưa có giá (chờ báo giá), tiệm chưa cấu hình mã QR.
 */
export function canViewTracking(o: {
  totalVnd: number
  paidVnd: number
  hasPaymentQr: boolean
  cancelled: boolean
  orderStatus?: string | null | undefined
  productionStatus?: string | null | undefined
  triggerPolicy?: TrackingTriggerPolicy | undefined
}): boolean {
  if (o.cancelled || o.totalVnd <= 0 || !o.hasPaymentQr) return true
  const isPaid = o.paidVnd > 0
  const isAccepted =
    o.orderStatus === "CONFIRMED" ||
    o.orderStatus === "PROCESSING" ||
    (Boolean(o.productionStatus) && o.productionStatus !== "WAITING")

  if (o.triggerPolicy === "PAYMENT_ONLY") {
    return isPaid
  }
  return isPaid || isAccepted
}

/** Link riêng `/b`: bước sẽ hiện khi mở lại, `null` = giữ bước máy chủ chọn. */
export function resumeCustomerStep(
  saved: CustomerStep,
  s: CustomerStepFacts & { serverStep: CustomerStep },
): CustomerStep | null {
  // Đơn đã trả đủ / đã huỷ → máy chủ chọn Theo dõi; không quay lại màn thanh toán
  if (s.hasOrder && s.serverStep === "TRACKING") return null
  return canEnterCustomerStep(saved, s) ? saved : null
}

/** Link chung `/g` · `/bst`: chỉ về "xem mẫu đã chọn" / form khi mẫu đó còn trong bộ sưu tập và còn hàng. */
export function resumePublicStep(
  saved: PublicStep,
  selectedId: string | null,
  products: ReadonlyArray<{ id: string; available?: boolean | undefined }>,
): PublicStep | null {
  if (saved !== "PREVIEW" && saved !== "ORDER_FORM") return null // đơn đã đặt: chuyển sang trang đơn ở chỗ khác
  return products.some((p) => p.id === selectedId && p.available !== false) ? saved : null
}

/** Size đã lưu mà tiệm vừa gỡ → về bản gốc thay vì gửi id không còn. */
export function sanitizeVariant<T extends { variantId: string }>(selection: T, variantIds: readonly string[]): T {
  return selection.variantId && !variantIds.includes(selection.variantId) ? { ...selection, variantId: "" } : selection
}
