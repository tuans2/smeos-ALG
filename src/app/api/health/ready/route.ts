import { NextResponse } from "next/server"

import { pingRedis } from "@/core/cache/redis-client"
import { isReady } from "@/core/observability/system-health"
import { pingDatabase } from "@/core/tenancy/infra/database-ping"
import { storageConfigReady } from "@/modules/assets/domain/storage-config"

/**
 * GET /api/health/ready — instance sẵn sàng nhận request (ROADMAP E1.4).
 *
 * Khác `/api/health` (healthCheckPath của Render, chỉ "tiến trình còn trả lời được CSDL"):
 * production còn cần Redis, vì giới hạn tần suất và hub SSE dùng chung giữa các instance.
 * Production còn cần kho tệp dùng chung (`STORAGE_*`), trừ khi bật `ALLOW_LOCAL_STORAGE` (P0-05).
 * Công khai như `/api/health` — chỉ trả trạng thái, chi tiết lỗi vào log máy chủ.
 */
export async function GET() {
  const [databaseUp, redis] = await Promise.all([pingDatabase(), pingRedis()])
  const ready = isReady(databaseUp, redis, process.env.NODE_ENV === "production") && storageConfigReady(process.env)

  return NextResponse.json(
    { status: ready ? "ready" : "not_ready", timestamp: new Date().toISOString() },
    { status: ready ? 200 : 503, headers: { "cache-control": "no-store" } }
  )
}
