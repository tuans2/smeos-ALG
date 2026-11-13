/**
 * Đối soát `orders.paid_vnd` với sổ `order_payments` (ADR-013 D-I6, bước I-3) — phần thuần.
 *
 * Số đã thu đúng = Σ khoản CONFIRMED loại DEPOSIT/BALANCE − Σ khoản CONFIRMED loại REFUND.
 * Mọi đường ghi `paid_vnd` hiện có đều tạo kèm dòng `order_payments` (rà mã 05/11/2026), nên
 * lệch nghĩa là dữ liệu sai hoặc có đường ghi mới bỏ sót sổ thu. Job chỉ ghi nhận, không tự sửa.
 */

export interface PaidMismatch {
  readonly organizationId: string
  readonly orderId: string
  /** Theo sổ thu. */
  readonly expectedVnd: number
  /** `orders.paid_vnd` đang lưu. */
  readonly actualVnd: number
}

export interface OpenFinding {
  readonly id: string
  readonly entityId: string
}

export interface ReconciliationPlan {
  /** Đơn đang lệch: mở mới hoặc cập nhật lần phát hiện cuối. */
  readonly upsert: readonly PaidMismatch[]
  /** Dòng đang mở mà đơn đã khớp lại. */
  readonly resolveIds: readonly string[]
}

export function planReconciliation(mismatches: readonly PaidMismatch[], open: readonly OpenFinding[]): ReconciliationPlan {
  const stillWrong = new Set(mismatches.map((m) => m.orderId))
  return {
    upsert: mismatches,
    resolveIds: open.filter((f) => !stillWrong.has(f.entityId)).map((f) => f.id),
  }
}
