/**
 * Dispatch Reminder Resolver (Pure Logic).
 * Tính toán kế thừa cấu hình 2 cấp & tính toán lịch trình kích hoạt cho 6 mốc.
 * Reference: SSOT ALG_Tieu_Chuan_Nhac_Nghiep_Vu_Dieu_Phoi_v1.md §4
 */

import {
  DEFAULT_DISPATCH_REMINDER_POLICY,
  type DispatchReminderPolicyConfig,
  type OrderReminderCalculationInput,
  type ResolvedMilestoneSchedule,
  type TemplateReminderOverrides,
} from "./dispatch-reminder-types"

/**
 * Tính toán bộ tham số timeout có hiệu lực dựa trên cơ chế kế thừa 2 cấp:
 * Template Overrides (Cấp 2) > Policy Cửa hàng (Cấp 1) > Mặc định hệ thống SSOT.
 */
export function resolveEffectiveReminderConfig(
  overrides?: TemplateReminderOverrides | null,
  policy?: Partial<DispatchReminderPolicyConfig> | null
): DispatchReminderPolicyConfig {
  const mergedPolicy: DispatchReminderPolicyConfig = {
    m0MinutesAfterPaid:
      policy?.m0MinutesAfterPaid ?? DEFAULT_DISPATCH_REMINDER_POLICY.m0MinutesAfterPaid,
    m1MinutesBeforeDelivery:
      policy?.m1MinutesBeforeDelivery ??
      DEFAULT_DISPATCH_REMINDER_POLICY.m1MinutesBeforeDelivery,
    m2MinutesBeforeDelivery:
      policy?.m2MinutesBeforeDelivery ??
      DEFAULT_DISPATCH_REMINDER_POLICY.m2MinutesBeforeDelivery,
    m3MinutesAfterShipperAssigned:
      policy?.m3MinutesAfterShipperAssigned ??
      DEFAULT_DISPATCH_REMINDER_POLICY.m3MinutesAfterShipperAssigned,
    m5MinutesAfterDelivery:
      policy?.m5MinutesAfterDelivery ??
      DEFAULT_DISPATCH_REMINDER_POLICY.m5MinutesAfterDelivery,
  }

  if (!overrides) {
    return mergedPolicy
  }

  return {
    m0MinutesAfterPaid: overrides.m0MinutesAfterPaid ?? mergedPolicy.m0MinutesAfterPaid,
    m1MinutesBeforeDelivery:
      overrides.m1MinutesBeforeDelivery ?? mergedPolicy.m1MinutesBeforeDelivery,
    m2MinutesBeforeDelivery:
      overrides.m2MinutesBeforeDelivery ?? mergedPolicy.m2MinutesBeforeDelivery,
    m3MinutesAfterShipperAssigned:
      overrides.m3MinutesAfterShipperAssigned ??
      mergedPolicy.m3MinutesAfterShipperAssigned,
    m5MinutesAfterDelivery:
      overrides.m5MinutesAfterDelivery ?? mergedPolicy.m5MinutesAfterDelivery,
  }
}

/**
 * Tính toán thời điểm kích hoạt của 6 mốc M0..M5 cho một đơn hàng.
 */
export function calculateMilestoneSchedule(
  input: OrderReminderCalculationInput,
  config: DispatchReminderPolicyConfig
): ResolvedMilestoneSchedule {
  const MS_PER_MINUTE = 60 * 1000

  // M0: Sau khi đơn nhận thanh toán + N phút
  const m0 = input.paidAt
    ? new Date(input.paidAt.getTime() + config.m0MinutesAfterPaid * MS_PER_MINUTE)
    : null

  // M1: Trước giờ giao đơn N phút
  const m1 = input.deliveryTime
    ? new Date(input.deliveryTime.getTime() - config.m1MinutesBeforeDelivery * MS_PER_MINUTE)
    : null

  // M2: Trước giờ giao đơn N phút
  const m2 = input.deliveryTime
    ? new Date(input.deliveryTime.getTime() - config.m2MinutesBeforeDelivery * MS_PER_MINUTE)
    : null

  // M3: Sau khi gán SĐT shipper + N phút
  const m3 = input.shipperAssignedAt
    ? new Date(
        input.shipperAssignedAt.getTime() +
          config.m3MinutesAfterShipperAssigned * MS_PER_MINUTE
      )
    : null

  // M4: Kích hoạt ngay khi có SĐT shipper
  const m4 = input.shipperAssignedAt ? new Date(input.shipperAssignedAt.getTime()) : null

  // M5: Sau giờ giao đơn + N phút (ưu tiên deliveredAt nếu đã giao thật)
  const deliveryReference = input.deliveredAt ?? input.deliveryTime
  const m5 = deliveryReference
    ? new Date(deliveryReference.getTime() + config.m5MinutesAfterDelivery * MS_PER_MINUTE)
    : null

  return { m0, m1, m2, m3, m4, m5 }
}
