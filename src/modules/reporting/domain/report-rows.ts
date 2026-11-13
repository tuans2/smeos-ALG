/** Hình dạng dữ liệu nguồn của báo cáo (Đợt 5) — thuần, infra map từ Prisma sang. */

export interface OrderRow {
  id: string
  code: string
  status: string
  totalVnd: number
  paidVnd: number
  createdAt: Date
  deliveryWindow: unknown
  saleId: string
  estimatedAt: Date | null
  shipper: { phone: string | null; name: string | null } | null
  deliveredAt: Date | null
}

export interface PaymentRow { kind: "DEPOSIT" | "BALANCE" | "REFUND"; amountVnd: number; method: string | null; collectedAt: Date }
export interface BankEventRow { id: string; amountVnd: number; content: string; status: string; at: Date; orderId: string | null }
export interface ItemRow { productId: string | null; name: string; quantity: number; unitPriceVnd: number; attributes: unknown }
export interface AssignmentRow { assigneeId: string; orderStatus: string; productionStatus: string }
