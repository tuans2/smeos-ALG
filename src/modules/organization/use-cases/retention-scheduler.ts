import { log } from "@/core/observability/log"
import { runExclusive } from "@/core/runtime/infra/cluster-lock"

import { isRetentionDue } from "../domain/retention-policy"
import { lastRetentionRunAt } from "../infra/retention-policy-repository"
import { runRetentionSweep } from "./run-retention-sweep"

const STARTED = Symbol.for("smeos.organization.retention-sweep")
const TICK_MS = 60 * 60 * 1000
const MAX_RUN_MS = 2 * 60 * 60 * 1000

/**
 * Hạn lưu hằng đêm (ADR-014 D-P4, gọi từ `src/instrumentation.ts` trong `asSystemDb`): kiểm mỗi giờ, chạy khi tới
 * khung 1–5 giờ sáng giờ Việt Nam và đêm nay chưa chạy. Một tiến trình trong cụm chạy (`runExclusive`); lượt trước chưa
 * xong thì bỏ lượt; `unref`. Tắt bằng `RETENTION_SWEEP=off`. Log chỉ có số dòng theo loại dữ liệu.
 */
export function startRetentionSweep(): void {
  const g = globalThis as unknown as Record<symbol, boolean | undefined>
  if (g[STARTED]) return
  if (process.env["RETENTION_SWEEP"] === "off") return
  g[STARTED] = true
  let running = false
  const tick = () => {
    if (running) return
    running = true
    runExclusive(
      "organization_retention_sweep",
      async () => {
        const now = new Date()
        return isRetentionDue(now, await lastRetentionRunAt()) ? runRetentionSweep(now) : null
      },
      MAX_RUN_MS,
    )
      .then((rows) => {
        for (const r of rows ?? []) {
          const fields = { feature: "retention", category: r.category, action: r.action, enforced: r.enforced, rows: r.rows }
          if (r.skipped) log.warn("retention.policy_skipped", { ...fields, reason: r.skipped })
          else log.info("retention.policy_ran", fields)
        }
      })
      .catch((error: unknown) => {
        log.error("retention.sweep_failed", { feature: "retention", message: error instanceof Error ? error.message : String(error) })
      })
      .finally(() => {
        running = false
      })
  }
  const timer = setInterval(tick, TICK_MS)
  timer.unref?.()
}
