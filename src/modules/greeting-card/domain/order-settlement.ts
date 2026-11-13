/**
 * Vòng đời đơn sau khi giao (PO 04/11/2026, Q6 — checklist ALG 4.26): giao xong mà còn nợ thì đơn ở
 * "Đã giao — chờ thu đủ" (`DELIVERED`), chỉ "Hoàn tất" (`COMPLETED`) khi số đã thu bằng tổng đơn.
 * Đơn tổng 0 (chưa báo giá / tặng) coi như đã đủ. Pure TypeScript.
 */
export type DeliveredOrderStatus = "COMPLETED" | "DELIVERED"

export function statusAfterDelivery(money: { totalVnd: number; paidVnd: number }): DeliveredOrderStatus {
  return money.totalVnd <= 0 || money.paidVnd >= money.totalVnd ? "COMPLETED" : "DELIVERED"
}

