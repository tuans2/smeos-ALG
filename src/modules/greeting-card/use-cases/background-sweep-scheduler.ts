import { log } from "@/core/observability/log"
import { runExclusive } from "@/core/runtime/cluster-lock"
import { SWEEP_INTERVAL_MS } from "../domain/background-sweep"
import { runBackgroundSweep } from "./background-sweep"

const STARTED = Symbol.for("floraos.greeting-card.sweep")

/**
 * Chạy bộ quét nền Thẻ chào mỗi phút trong tiến trình web (gọi từ `src/instrumentation.ts`).
 * Một lần mỗi tiến trình; vòng trước chưa xong thì bỏ lượt; không giữ tiến trình sống (`unref`).
 * Tắt bằng `GREETING_CARD_SWEEP=off` hoặc khi tắt cả tính năng (`GREETING_CARD_ENABLED=false`).
 */
export function startBackgroundSweep(): void {
  const g = globalThis as unknown as Record<symbol, boolean | undefined>
  if (g[STARTED]) return
  if (process.env["GREETING_CARD_SWEEP"] === "off" || process.env["GREETING_CARD_ENABLED"] === "false") return
  g[STARTED] = true
  let running = false
  const timer = setInterval(() => {
    if (running) return
    running = true
    // Một tiến trình trong cụm chạy mỗi lượt (audit hành trình S2, UJ-11)
    runExclusive("greeting_card_background_sweep", runBackgroundSweep)
      .then((r) => {
        if (r && r.staleFailed + r.retried + r.reminded + r.cancelled + (r.sessionsExpired || 0) > 0) log.info("greeting_card.sweep", { feature: "greeting-card", ...r })
      })
      .catch((error: unknown) => {
        log.error("greeting_card.sweep_failed", { feature: "greeting-card", message: error instanceof Error ? error.message : String(error) })
      })
      .finally(() => {
        running = false
      })
  }, SWEEP_INTERVAL_MS)
  timer.unref?.()
}
