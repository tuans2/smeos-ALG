import { log } from "@/core/observability/log"
import { runExclusive } from "@/core/runtime/infra/cluster-lock"

import { reconcileOrderPayments } from "./reconcile-order-payments"

const STARTED = Symbol.for("alg.orders.payment-reconciliation")
const INTERVAL_MS = 6 * 60 * 60 * 1000

/**
 * Đối soát số đã thu mỗi 6 giờ (gọi từ `src/instrumentation.ts`). Một lần mỗi tiến trình; vòng trước chưa
 * xong thì bỏ lượt; `unref`. Có lệch → log `warn` để cảnh báo (ADR-015 D-O8). Tắt bằng `PAYMENT_RECONCILIATION=off`.
 */
export function startPaymentReconciliation(): void {
  const g = globalThis as unknown as Record<symbol, boolean | undefined>
  if (g[STARTED]) return
  if (process.env["PAYMENT_RECONCILIATION"] === "off") return
  g[STARTED] = true
  let running = false
  const run = () => {
    if (running) return
    running = true
    // Một tiến trình trong cụm chạy mỗi lượt (audit hành trình S2, UJ-11)
    runExclusive("orders_payment_reconciliation", reconcileOrderPayments)
      .then((r) => {
        if (!r) return
        if (r.mismatched > 0) log.warn("orders.payment_reconciliation_mismatch", { feature: "orders", ...r })
        else if (r.resolved > 0) log.info("orders.payment_reconciliation_resolved", { feature: "orders", ...r })
      })
      .catch((error: unknown) => {
        log.error("orders.payment_reconciliation_failed", { feature: "orders", message: error instanceof Error ? error.message : String(error) })
      })
      .finally(() => {
        running = false
      })
  }
  const timer = setInterval(run, INTERVAL_MS)
  timer.unref?.()
}
