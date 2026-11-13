/**
 * Thứ tự hiển thị trên bảng điều phối (checklist ALG 4.12): đơn nguy cơ trễ lên đầu — Đã trễ, Nguy cơ trễ, Cần chú ý,
 * rồi Bình thường. Trong cùng một mức giữ nguyên thứ tự sẵn có (sắp xếp ổn định).
 */
export type RiskLevel = "NORMAL" | "ATTENTION" | "AT_RISK" | "CRITICAL"

const RANK: Record<RiskLevel, number> = { CRITICAL: 0, AT_RISK: 1, ATTENTION: 2, NORMAL: 3 }

export function sortByRisk<T extends { riskLevel: RiskLevel }>(orders: readonly T[]): T[] {
  return orders
    .map((order, index) => ({ order, index }))
    .sort((a, b) => RANK[a.order.riskLevel] - RANK[b.order.riskLevel] || a.index - b.index)
    .map((x) => x.order)
}
