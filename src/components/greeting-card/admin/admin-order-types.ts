export interface AdminOrder {
  id: string
  code: string
  status: string
  delivery_status: string
  production_status?: string
  total_vnd: number
  paid_vnd: number
  balance_vnd: number
  customer: { name: string; phone: string | null } | null
  greeting_sessions: Array<{ send_code: string; status: string; product_snapshot?: unknown }>
  items?: Array<{ metadata?: unknown; quantity?: number; unit_price_vnd?: number }>
  pricing_rule_ref?: unknown
  /** Thông tin sản phẩm dựng sẵn ở server (SSOT) — `paymentCheckOf` ưu tiên trường này. */
  product?: import("@/modules/greeting-card/domain/order-product-view").OrderProductView
  payments: Array<{ id: string; kind: string; amount_vnd: number; collected_at: string; reference: string | null; note?: string | null }>
  qc_records?: Array<{ notes: string | null; created_at: string | Date }>
  created_at: string
  /** URL ảnh chuyển khoản Lần 1 (Cọc/Trả đủ) do khách tải lên — đã ký, hết hạn sau 1h. */
  paymentProofUrl?: string | null | undefined
  paymentProofAnalysis?: import("@/modules/greeting-card/domain/payment-proof-analysis").PaymentProofAnalysisResult | null | undefined
  /** URL ảnh chuyển khoản Lần 2 (Phần còn lại) do khách tải lên — đã ký, hết hạn sau 1h. */
  paymentProofBalanceUrl?: string | null | undefined
  paymentProofBalanceAnalysis?: import("@/modules/greeting-card/domain/payment-proof-analysis").PaymentProofAnalysisResult | null | undefined
  /** Khoản hoàn đang chờ ở "Cần hoàn tiền" (Hộp việc) — có thì không ghi hoàn trực tiếp ở bảng. */
  pending_refund_vnd?: number | null | undefined
}

export type AdminOrderDialogAction = { type: "quote" | "collect" | "cancel" | "refund"; order: AdminOrder }
export type OrderAction =
  | AdminOrderDialogAction
  | { type: "confirm-order" | "reject-order"; order: AdminOrder }

/** Kết quả thao tác: lời báo cho Điều hành + (khi vừa thu tiền) tin soạn sẵn để gửi khách qua Zalo. */
export type ActionResult = { message: string; customerMessage?: string | undefined }

export const ORDER_FILTERS = [
  { id: "reported", label: "Khách báo đã chuyển", query: "payment=OUTSTANDING&reported=1" },
  { id: "outstanding", label: "Còn phải thu", query: "payment=OUTSTANDING" },
  { id: "delivered-debt", label: "Đã giao còn nợ", query: "payment=OUTSTANDING&delivered=1" },
  { id: "paid", label: "Đã thu đủ", query: "payment=PAID" },
  { id: "cancelled", label: "Đã huỷ", query: "status=CANCELLED" },
  { id: "all", label: "Tất cả", query: "" },
] as const

export type OrderFilterId = (typeof ORDER_FILTERS)[number]["id"]

export const vnd = (n: number) => `${n.toLocaleString("vi-VN")} đ`
