import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { EXPECTED_WORKERS } from "@/core/observability/system-health"
import { countLiveWorkers } from "@/modules/jobs/infra/job-health-query"
import { readSystemHealth as readSystemHealthQuery, type PlatformSystemHealth } from "@/modules/platform/infra/platform-query"
import { readQueueByFeature, type QueueByFeature } from "@/modules/platform/infra/platform-queue-query"

export type PlatformSystemHealthView = PlatformSystemHealth & {
  queue: QueueByFeature[]
  /** Worker bắt buộc trên production và số kết nối đang mở (0 = không chạy). */
  workers: Array<{ name: string; connections: number }>
}

/**
 * `GET /platform/health` (`N5`, P25a). Chỉ đọc + cảnh báo (D-N5) — không
 * nút hành động, không đánh dấu job treo là FAILED. Xem đặc tả 06 mục 21.
 */
export async function readSystemHealth(pctx: PlatformContext, now = new Date()): Promise<PlatformSystemHealthView> {
  requirePlatformCapability(pctx, "N5")
  const [base, queue, live] = await Promise.all([readSystemHealthQuery(pctx), readQueueByFeature(now), countLiveWorkers()])
  return { ...base, queue, workers: EXPECTED_WORKERS.map((name) => ({ name, connections: live[name] ?? 0 })) }
}
