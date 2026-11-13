/**
 * API Route: Dev Role Override
 * POST   /api/dev/role-override  — set cookie override
 * DELETE /api/dev/role-override  — clear cookie override
 *
 * ⚠️  Guard: endpoint chỉ hoạt động khi NODE_ENV !== "production".
 *    Production trả 404 cứng — không bao giờ expose.
 */

import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { DEV_ROLE_COOKIE } from "@/lib/dev-role-override"

const IS_DEV = process.env.NODE_ENV !== "production"

const OverrideSchema = z.object({
  roleKey: z.string().min(1),
  organizationType: z.string().min(1),
  orgNameSuffix: z.string().optional(),
})

export async function POST(request: Request) {
  if (!IS_DEV) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = OverrideSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 })
  }

  const cookieStore = await cookies()
  cookieStore.set(DEV_ROLE_COOKIE, JSON.stringify(parsed.data), {
    httpOnly: false, // cần đọc được từ JS để DevPanel hiện trạng thái active
    sameSite: "lax",
    path: "/",
    // Không set maxAge → session cookie, mất khi đóng tab
  })

  return NextResponse.json({ ok: true, applied: parsed.data })
}

export async function DELETE() {
  if (!IS_DEV) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const cookieStore = await cookies()
  cookieStore.delete(DEV_ROLE_COOKIE)

  return NextResponse.json({ ok: true, cleared: true })
}
