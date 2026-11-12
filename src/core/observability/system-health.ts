/**
 * Tổng hợp sức khoẻ hệ thống cho `GET /api/v1/internal/health` (chỉ cron/người vận hành gọi).
 * Hàm thuần: các phép đo được truyền vào, nên test không cần CSDL hay Redis.
 */

export type RedisState = "ok" | "down" | "not_configured"

export interface HealthProbes {
  /** Độ trễ `SELECT 1` (ms); `null` khi CSDL không trả lời. */
  databaseLatencyMs: () => Promise<number | null>
  redis: () => Promise<RedisState>
  jobBacklog: () => Promise<{ pendingTooLong: number; processingTooLong: number }>
  /** Số kết nối đang mở của từng worker (`application_name` = `alg-worker:<tên>` (tên cũ `smeos-worker:<tên>` vẫn đếm)). */
  workers?: () => Promise<Record<string, number>>
}

export interface SystemHealth {
  status: "ok" | "degraded" | "down"
  timestamp: string
  issues: string[]
  database: { up: boolean; latencyMs: number | null }
  redis: RedisState
  jobs: { pendingTooLong: number; processingTooLong: number } | null
  workers?: Record<string, number>
}

/** Worker phải chạy trên production (`render.yaml`). */
export const EXPECTED_WORKERS = ["vision", "media", "video"] as const

/** Sẵn sàng nhận request: CSDL trả lời; production còn cần Redis không sập. */
export function isReady(databaseUp: boolean, redis: RedisState, production: boolean): boolean {
  if (!databaseUp) return false
  return !production || redis === "ok"
}

/** CSDL chậm hơn mức này vẫn sống nhưng đáng báo. */
export const SLOW_DATABASE_MS = 1000

export async function checkSystemHealth(
  probes: HealthProbes,
  options: { production: boolean; now?: Date }
): Promise<SystemHealth> {
  const timestamp = (options.now ?? new Date()).toISOString()
  const [latencyMs, redis] = await Promise.all([probes.databaseLatencyMs(), probes.redis()])
  const issues: string[] = []

  if (latencyMs === null) {
    return { status: "down", timestamp, issues: ["database_unreachable"], database: { up: false, latencyMs }, redis, jobs: null }
  }
  if (latencyMs > SLOW_DATABASE_MS) issues.push("database_slow")
  if (redis === "down") issues.push("redis_down")
  // Production cần Redis cho giới hạn tần suất dùng chung các instance (render.yaml, H7)
  if (redis === "not_configured" && options.production) issues.push("redis_not_configured")

  let jobs: SystemHealth["jobs"] = null
  try {
    jobs = await probes.jobBacklog()
    if (jobs.pendingTooLong > 0) issues.push("jobs_pending_too_long")
    if (jobs.processingTooLong > 0) issues.push("jobs_processing_too_long")
  } catch {
    issues.push("jobs_unreadable")
  }

  let workers: Record<string, number> | undefined
  if (probes.workers) {
    try {
      workers = await probes.workers()
      // Ngoài production worker thường không chạy — chỉ báo, không coi là lỗi.
      if (options.production) {
        for (const name of EXPECTED_WORKERS) if (!workers[name]) issues.push(`worker_offline:${name}`)
      }
    } catch {
      issues.push("workers_unreadable")
    }
  }

  return {
    status: issues.length ? "degraded" : "ok",
    timestamp,
    issues,
    database: { up: true, latencyMs },
    redis,
    jobs,
    ...(workers ? { workers } : {}),
  }
}
