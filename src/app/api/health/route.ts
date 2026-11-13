import { NextResponse } from "next/server"

import { pingDatabase } from "@/core/tenancy/infra/database-ping"

/**
 * GET /api/health — healthCheckPath của Render.
 *
 * Công khai, nên chỉ trả trạng thái: không host/tên CSDL, không lỗi/stack, không đếm bảng
 * (rà soát 21/10/2026, H2). Chi tiết lỗi chỉ vào log máy chủ.
 */
export async function GET() {
  const databaseUp = await pingDatabase()

  return NextResponse.json(
    { status: databaseUp ? "ok" : "degraded", timestamp: new Date().toISOString() },
    { status: databaseUp ? 200 : 503, headers: { "cache-control": "no-store" } }
  )
}
