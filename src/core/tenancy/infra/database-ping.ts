import { log } from "@/core/observability/log"

import { prisma } from "./prisma"

/** Kiểm CSDL còn trả lời không — không đọc bảng nào, không trả dữ liệu. Lỗi chỉ vào log. */
export async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    log.error("health.database_unreachable", {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

/** Độ trễ `SELECT 1` tính bằng ms; `null` khi CSDL không trả lời (lỗi đã vào log). */
export async function measureDatabaseLatency(): Promise<number | null> {
  const start = Date.now()
  return (await pingDatabase()) ? Date.now() - start : null
}
