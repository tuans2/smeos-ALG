/**
 * GET /api/v1/internal/health — sức khoẻ chi tiết: độ trễ CSDL, Redis, job tồn đọng.
 *
 * Khác `/api/health` (công khai, chỉ "sống hay không", Render dùng làm healthCheckPath): route
 * này gác bằng `x-cron-secret` như cron quét nhắc mốc. Cron `smeos-cron-dispatch-sweep` gọi
 * nó với `curl -f` sau mỗi lượt quét, nên không khoẻ → 503 → lượt cron thất bại → Render gửi
 * thông báo (docs/kien-truc/VAN_HANH_SU_CO_VA_SAO_LUU.md). Rà soát 21/10/2026, giai đoạn 3.
 */
import { pingRedis } from "@/core/cache/redis-client"
import { isAuthorizedCronRequest } from "@/core/http/cron-auth"
import { AppError } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { log } from "@/core/observability/log"
import { checkSystemHealth } from "@/core/observability/system-health"
import { measureDatabaseLatency } from "@/core/tenancy/infra/database-ping"
import { STUCK_JOB_TIMEOUT_MS } from "@/modules/jobs/domain/job-rules"
import { countJobBacklog, countLiveWorkers } from "@/modules/jobs/infra/job-health-query"

export const GET = handle(async (request) => {
  if (!isAuthorizedCronRequest(request)) {
    throw new AppError("UNAUTHENTICATED", "Không được phép")
  }
  const now = new Date()
  const health = await checkSystemHealth(
    {
      databaseLatencyMs: measureDatabaseLatency,
      redis: pingRedis,
      jobBacklog: () => countJobBacklog(now, STUCK_JOB_TIMEOUT_MS),
      workers: countLiveWorkers,
    },
    { production: process.env.NODE_ENV === "production", now }
  )
  if (health.status !== "ok") log.warn("health.degraded", { status: health.status, issues: health.issues })
  return jsonResponse(health, { status: health.status === "ok" ? 200 : 503, headers: { "cache-control": "no-store" } })
})
