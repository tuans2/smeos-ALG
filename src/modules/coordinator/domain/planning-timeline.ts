/**
 * ĐP-4a.9 (27/09/2026), Đặc tả trường §4.2 — tính ngược 4 mốc "hạn muộn
 * nhất phải bắt đầu" (`latest*Start`) từ `deliveryTargetAt` và các khoảng
 * đệm điều phối viên đặt ở Form Lập kế hoạch. Hàm thuần — không đọc DB.
 *
 * Thiếu `deliveryTargetAt` thì không tính được gì (đơn chưa có hạn giao) —
 * trả về toàn `null`. Thiếu một khoảng đệm thì coi bước đó là 0 phút (an
 * toàn hơn coi như "không giới hạn" — sai lệch duy nhất là cảnh báo trễ
 * hơn thực tế cần, không phải sớm hơn).
 */

export interface PlanningDurations {
  readonly plannedProductionMinutes?: number | null | undefined
  readonly plannedQcBufferMinutes?: number | null | undefined
  readonly plannedPickupMinutes?: number | null | undefined
  readonly plannedDeliveryMinutes?: number | null | undefined
}

export interface LatestStarts {
  readonly latestDispatchStart: Date | null
  readonly latestPickupStart: Date | null
  readonly latestQCStart: Date | null
  readonly latestProductionStart: Date | null
}

function minutes(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0
}

export function computeLatestStarts(deliveryTargetAt: Date | null, durations: PlanningDurations): LatestStarts {
  if (!deliveryTargetAt) {
    return { latestDispatchStart: null, latestPickupStart: null, latestQCStart: null, latestProductionStart: null }
  }
  const back = (from: Date, mins: number) => new Date(from.getTime() - mins * 60_000)
  const latestDispatchStart = back(deliveryTargetAt, minutes(durations.plannedDeliveryMinutes))
  const latestPickupStart = back(latestDispatchStart, minutes(durations.plannedPickupMinutes))
  const latestQCStart = back(latestPickupStart, minutes(durations.plannedQcBufferMinutes))
  const latestProductionStart = back(latestQCStart, minutes(durations.plannedProductionMinutes))
  return { latestDispatchStart, latestPickupStart, latestQCStart, latestProductionStart }
}
