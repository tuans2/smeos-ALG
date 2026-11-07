import { formatDate } from "@/lib/i18n/formatters"
import { vnDate } from "./report-period"

/**
 * Thẻ "Hiệu năng kinh doanh" trên `/so-lieu` (audit BL-12, PO 07/11/2026 Q4) — luật thuần.
 * Số liệu lấy từ báo cáo theo kỳ phía máy chủ (`/api/v1/reports/orders|revenue|products`), không còn tính trên
 * 100 đơn đầu tiên ở trình duyệt. Định nghĩa KPI (một bảng, trùng `order-revenue-report.ts`):
 * - Giá trị đơn (chỉ số chính) = tổng giá trị các đơn chưa huỷ tạo trong kỳ.
 * - Đã thu thực tế = khoản thu đã xác nhận trong kỳ (cọc + thu nốt) trừ hoàn tiền.
 * - Giá trị đơn trung bình = Giá trị đơn / số đơn chưa huỷ.
 * - Tỷ lệ hoàn tất = đơn đã giao hoặc hoàn tất / tổng đơn tạo trong kỳ.
 * - Sản phẩm bán chạy = xếp theo giá trị dòng hàng của đơn chưa huỷ.
 */

export const BUSINESS_RANGES = ["Tuần này", "Tháng này", "Quý này"] as const
export type BusinessRange = (typeof BUSINESS_RANGES)[number]

const DAY_MS = 86_400_000

/** Kỳ của nút chọn nhanh, theo giờ Việt Nam: từ thứ Hai / mùng 1 / đầu quý đến hôm nay. */
export function rangePeriod(range: string, now: Date = new Date()): { from: string; to: string } {
  const to = vnDate(now)
  const [y, m] = to.split("-").map(Number) as [number, number]
  if (range === "Tuần này") {
    const weekday = new Date(`${to}T00:00:00Z`).getUTCDay() // 0 = Chủ nhật
    const back = (weekday + 6) % 7
    return { from: vnDate(new Date(new Date(`${to}T00:00:00+07:00`).getTime() - back * DAY_MS)), to }
  }
  if (range === "Quý này") {
    const qStart = Math.floor((m - 1) / 3) * 3 + 1
    return { from: `${y}-${String(qStart).padStart(2, "0")}-01`, to }
  }
  return { from: `${to.slice(0, 7)}-01`, to }
}

export interface OrderReportTotals { total: number; completed: number; cancelled: number; overdueOpen: number; completionRate: number | null }
export interface RevenueReportTotals { expectedVnd: number; netCollectedVnd: number; collectionRate: number | null }
export interface ProductReportRow { productId: string | null; name: string; quantity: number; valueVnd: number }

export interface BusinessSummary {
  orderValueVnd: number
  collectedVnd: number
  collectionRatePercent: number | null
  averageOrderValueVnd: number
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  openOrders: number
  overdueOpenOrders: number
  completionRatePercent: number | null
  topProducts: ProductReportRow[]
  aiCreditUsed: number
}

export function summarizeBusiness(
  orders: OrderReportTotals,
  revenue: RevenueReportTotals,
  productsByValue: ProductReportRow[],
  aiCreditUsed = 0,
): BusinessSummary {
  const notCancelled = orders.total - orders.cancelled
  return {
    orderValueVnd: revenue.expectedVnd,
    collectedVnd: revenue.netCollectedVnd,
    collectionRatePercent: revenue.collectionRate,
    averageOrderValueVnd: notCancelled > 0 ? Math.round(revenue.expectedVnd / notCancelled) : 0,
    totalOrders: orders.total,
    completedOrders: orders.completed,
    cancelledOrders: orders.cancelled,
    openOrders: Math.max(0, notCancelled - orders.completed),
    overdueOpenOrders: orders.overdueOpen,
    completionRatePercent: orders.completionRate,
    topProducts: productsByValue.slice(0, 5),
    aiCreditUsed,
  }
}

const csvText = (s: string) => `"${s.replace(/"/g, '""')}"`

/** Nội dung CSV để tải về — cùng định nghĩa KPI với thẻ. */
export function businessSummaryCsv(s: BusinessSummary, shopName: string, period: { from: string; to: string }, exportDate = new Date()): string {
  const lines = [
    `BÁO CÁO HIỆU NĂNG KINH DOANH — ${shopName.toUpperCase()}`,
    `Kỳ báo cáo: ${period.from} đến ${period.to}`,
    `Ngày xuất báo cáo: ${formatDate(exportDate)}`,
    "",
    "CHỈ SỐ,GIÁ TRỊ",
    `Giá trị đơn (VND),${s.orderValueVnd}`,
    `Đã thu thực tế (VND),${s.collectedVnd}`,
    `Giá trị đơn trung bình (VND),${s.averageOrderValueVnd}`,
    `Tổng số đơn,${s.totalOrders}`,
    `Đơn đã giao hoặc hoàn tất,${s.completedOrders}`,
    `Đơn bị huỷ,${s.cancelledOrders}`,
    `Đơn đang xử lý,${s.openOrders}`,
    `Tỷ lệ hoàn tất,${s.completionRatePercent ?? 0}%`,
    `Credit AI đã dùng,${s.aiCreditUsed}`,
    "",
    "SẢN PHẨM BÁN CHẠY,SỐ LƯỢNG,GIÁ TRỊ (VND)",
    ...s.topProducts.map((p) => `${csvText(p.name)},${p.quantity},${p.valueVnd}`),
  ]
  return lines.join("\n")
}
