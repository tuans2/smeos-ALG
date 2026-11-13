import type { CoordinationOrder } from "./coordinator-api"

/**
 * Đơn không còn chuyển bước được ở màn Điều phối: đã kết thúc, hoặc là đơn Thẻ chào (có luật thu tiền/báo khách
 * riêng, xử lý ở trang Thẻ chào — máy chủ cũng chặn, audit hành trình O5, gói UJ-02).
 */
export function isStageAdvanceLocked(order: Pick<CoordinationOrder, "stage" | "source">): boolean {
  return order.stage === "COMPLETED" || order.stage === "CANCELLED" || order.source === "BROCHURE"
}
