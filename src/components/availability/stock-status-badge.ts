import type { StockStatus } from "@/modules/products/domain/product-master-index"

export type StockBadgeIcon = "in-stock" | "pre-order" | "out-of-stock"

export interface StockBadge {
  readonly label: string
  readonly className: string
  readonly icon: StockBadgeIcon
}

/**
 * Nhãn trạng thái tồn trên bảng "Tồn kho nhanh" — theo đúng enum `stock_status` của máy chủ (audit User Journey R2-08:
 * bảng từng so `LOW_STOCK` không tồn tại và hiện hàng "Chỉ đặt trước" thành "Còn hàng"). Màu dùng token `*-bg` /
 * `*-text` đạt tương phản (OPERATING_PRINCIPLES §3). Giá trị lạ hoặc thiếu → coi như còn hàng (như trước).
 */
const BADGES: Record<StockStatus, StockBadge> = {
  IN_STOCK: { label: "Còn hàng", className: "bg-success-bg text-success-text", icon: "in-stock" },
  PRE_ORDER_ONLY: { label: "Chỉ đặt trước", className: "bg-warning-bg text-warning-text", icon: "pre-order" },
  OUT_OF_STOCK: { label: "Tạm hết hàng", className: "bg-danger-bg text-danger-text", icon: "out-of-stock" },
}

export function stockBadge(status: string | null | undefined): StockBadge {
  return BADGES[(status ?? "IN_STOCK") as StockStatus] ?? BADGES.IN_STOCK
}
