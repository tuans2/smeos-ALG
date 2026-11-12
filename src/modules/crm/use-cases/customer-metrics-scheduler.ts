import { log } from "@/core/observability/log"
import { CUSTOMER_METRICS_LOOKBACK_MS, sweepCustomerMetrics } from "./customer-metrics-sweep"

const STARTED = Symbol.for("alg.crm.customer-metrics")
const INTERVAL_MS = 5 * 60 * 1000

/**
 * Mỗi 5 phút (gọi từ `src/instrumentation.ts`, quyền hệ thống): tính lại chỉ số khách có đơn vừa đổi.
 * Một lần mỗi tiến trình; vòng trước chưa xong thì bỏ lượt; `unref`. Tắt bằng `CUSTOMER_METRICS_SWEEP=off`.
 */
export function startCustomerMetricsSweep(): void {
  const g = globalThis as unknown as Record<symbol, boolean | undefined>
  if (g[STARTED]) return
  if (process.env["CUSTOMER_METRICS_SWEEP"] === "off") return
  g[STARTED] = true
  let since = new Date(Date.now() - CUSTOMER_METRICS_LOOKBACK_MS)
  let afterId: string | undefined
  let running = false
  const timer = setInterval(() => {
    if (running) return
    running = true
    sweepCustomerMetrics(since, undefined, afterId)
      .then((r) => {
        since = r.nextSince
        afterId = r.nextAfterId
        if (r.synced > 0 || r.failed > 0) log.info("crm.customer_metrics_swept", { feature: "crm", synced: r.synced, failed: r.failed })
      })
      .catch((error: unknown) => {
        log.error("crm.customer_metrics_sweep_failed", { feature: "crm", message: error instanceof Error ? error.message : String(error) })
      })
      .finally(() => {
        running = false
      })
  }, INTERVAL_MS)
  timer.unref?.()
}
