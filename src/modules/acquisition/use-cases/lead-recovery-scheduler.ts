import { log } from "@/core/observability/log"
import { runExclusive } from "@/core/runtime/cluster-lock"
import { recoverPaymentTimeoutLeads } from "./recover-payment-timeout-leads"

const STARTED = Symbol.for("smeos.acquisition.lead-recovery")
const INTERVAL_MS = 5 * 60 * 1000

/**
 * Chạy bộ quét "đơn quá hạn thanh toán → lead" mỗi 5 phút trong tiến trình web (gọi từ
 * `src/instrumentation.ts`). Một lần mỗi tiến trình; vòng trước chưa xong thì bỏ lượt; không giữ tiến
 * trình sống (`unref`). Tắt bằng `LEAD_RECOVERY_SWEEP=off`.
 */
export function startLeadRecoverySweep(): void {
  const g = globalThis as unknown as Record<symbol, boolean | undefined>
  if (g[STARTED]) return
  if (process.env["LEAD_RECOVERY_SWEEP"] === "off") return
  g[STARTED] = true
  let running = false
  const timer = setInterval(() => {
    if (running) return
    running = true
    // Một tiến trình trong cụm chạy mỗi lượt (audit hành trình S2, UJ-11)
    runExclusive("acquisition_lead_recovery", recoverPaymentTimeoutLeads)
      .then((r) => {
        if (r && r.created > 0) log.info("acquisition.lead_recovery", { feature: "acquisition", ...r })
      })
      .catch((error: unknown) => {
        log.error("acquisition.lead_recovery_sweep_failed", { feature: "acquisition", message: error instanceof Error ? error.message : String(error) })
      })
      .finally(() => {
        running = false
      })
  }, INTERVAL_MS)
  timer.unref?.()
}
