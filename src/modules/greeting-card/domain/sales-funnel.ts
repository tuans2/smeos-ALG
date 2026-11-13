/**
 * Phễu chuyển đổi Thẻ chào theo từng sale: gửi → mở → chọn mẫu → đặt → thu tiền.
 * Pure TypeScript — số liệu thô do infra đếm, ở đây chỉ ghép và tính tỷ lệ.
 */

export interface SaleFunnelCounts {
  saleId: string
  sent: number
  opened: number
  selected: number
  ordered: number
  paid: number
  revenueVnd: number
}

export interface SaleFunnelRow extends SaleFunnelCounts {
  saleName: string
  /** Tỷ lệ % (0–100, làm tròn 1 chữ số) so với số link đã gửi. */
  openRate: number
  orderRate: number
  paidRate: number
}

function rate(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0
}

export const PUBLIC_SALE_ID = "public"

export function buildSalesFunnel(
  counts: SaleFunnelCounts[],
  names: Map<string, string>
): { rows: SaleFunnelRow[]; total: SaleFunnelRow } {
  const rows = counts
    .map((c) => ({
      ...c,
      saleName:
        c.saleId === PUBLIC_SALE_ID ? "Link bộ sưu tập công khai" : names.get(c.saleId) ?? "Nhân viên đã rời",
      openRate: rate(c.opened, c.sent),
      orderRate: rate(c.ordered, c.sent),
      paidRate: rate(c.paid, c.sent),
    }))
    .sort((a, b) => b.revenueVnd - a.revenueVnd || b.ordered - a.ordered)

  const sum = (k: keyof SaleFunnelCounts) => counts.reduce((acc, c) => acc + (c[k] as number), 0)
  const totalCounts: SaleFunnelCounts = {
    saleId: "ALL",
    sent: sum("sent"),
    opened: sum("opened"),
    selected: sum("selected"),
    ordered: sum("ordered"),
    paid: sum("paid"),
    revenueVnd: sum("revenueVnd"),
  }
  return {
    rows,
    total: {
      ...totalCounts,
      saleName: "Tổng cộng",
      openRate: rate(totalCounts.opened, totalCounts.sent),
      orderRate: rate(totalCounts.ordered, totalCounts.sent),
      paidRate: rate(totalCounts.paid, totalCounts.sent),
    },
  }
}
