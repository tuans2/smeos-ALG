export interface PricePoint {
  unitCostVnd: number
  effectiveAt: Date
}

export interface PriceChange {
  previousVnd: number
  currentVnd: number
  /** Phần trăm thay đổi so với lần trước (dương = tăng), làm tròn 1 chữ số. */
  changePercent: number
  alert: boolean
}

/**
 * So đơn giá mới nhất với lần trước (#32). Cảnh báo khi |thay đổi| ≥ ngưỡng của ngành/cửa hàng.
 * Ít hơn 2 mốc giá thì chưa có gì để so → `null`.
 */
export function detectPriceChange(history: readonly PricePoint[], alertPercent: number): PriceChange | null {
  const sorted = [...history].sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime())
  const [current, previous] = sorted
  if (!current || !previous || previous.unitCostVnd <= 0) return null
  const changePercent = Math.round(((current.unitCostVnd - previous.unitCostVnd) / previous.unitCostVnd) * 1000) / 10
  return {
    previousVnd: previous.unitCostVnd,
    currentVnd: current.unitCostVnd,
    changePercent,
    alert: Math.abs(changePercent) >= alertPercent,
  }
}
