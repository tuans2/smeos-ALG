import "server-only"
import Redis from "ioredis"
import { log } from "@/core/observability/log"

/**
 * Kết nối Redis dùng chung (giới hạn tần suất, bộ đếm phân tán).
 *
 * `REDIS_URL` trống → trả `null`: bên gọi tự rơi về phương án trong bộ nhớ
 * (dev/test). Cấu hình "hỏng nhanh": lệnh chờ kết nối tối đa 500ms
 * (`commandTimeout`), thử lại tối đa 1 lần — một Redis chậm hay sập không
 * được kéo chậm request.
 */

let client: Redis | null | undefined

export function getRedis(): Redis | null {
  if (client !== undefined) return client
  const url = process.env["REDIS_URL"]?.trim()
  if (!url) {
    client = null
    return client
  }
  client = new Redis(url, {
    lazyConnect: false,
    enableOfflineQueue: true,
    maxRetriesPerRequest: 1,
    commandTimeout: 500,
    connectTimeout: 2000,
  })
  client.on("error", (error: Error) => {
    log.warn("redis.error", { feature: "rate-limit", message: error.message })
  })
  return client
}

/** Chỉ dùng trong test: đóng kết nối để tiến trình thoát sạch. */
export async function closeRedis(): Promise<void> {
  if (client) await client.quit().catch(() => undefined)
  client = undefined
}

/** Redis còn trả lời `PING` không — cho `GET /internal/health`. */
export async function pingRedis(): Promise<"ok" | "down" | "not_configured"> {
  const redis = getRedis()
  if (!redis) return "not_configured"
  try {
    return (await redis.ping()) === "PONG" ? "ok" : "down"
  } catch {
    return "down"
  }
}
