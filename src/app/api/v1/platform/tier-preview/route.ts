/**
 * POST   /api/v1/platform/tier-preview  { roleKey } — xem trước tầng/vai
 * DELETE /api/v1/platform/tier-preview              — về vai thật
 *
 * Chỉ người vận hành nền tảng có N1. Chỉ đổi khuôn trải nghiệm, không đổi
 * tổ chức hay quyền (xem `tier-preview.ts`).
 */

import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import {
  TIER_PREVIEW_CAPABILITY,
  TIER_PREVIEW_COOKIE,
  buildTierPreview,
  entryHrefFor,
} from "@/modules/platform/domain/tier-preview"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { tierPreviewBody } from "@/app/api/v1/platform/_contracts/requests"

function serializeCookie(value: string, maxAgeSeconds?: number): string {
  const parts = [`${TIER_PREVIEW_COOKIE}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"]
  if (maxAgeSeconds !== undefined) parts.push(`Max-Age=${maxAgeSeconds}`)
  if (process.env.NODE_ENV === "production") parts.push("Secure")
  return parts.join("; ")
}

export const POST = handle(async (request) => {
  const pctx = await requirePlatformContext(request)
  requirePlatformCapability(pctx, TIER_PREVIEW_CAPABILITY)

  const parsed = tierPreviewBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const preview = buildTierPreview(parsed.data.roleKey)
  if (!preview) throw validationFailed({ roleKey: "Vai không tồn tại hoặc đang phát triển" })

  return jsonResponse(
    { data: { ...preview, entryHref: entryHrefFor(preview.roleKey) } },
    { headers: { "set-cookie": serializeCookie(preview.roleKey) } }
  )
})

export const DELETE = handle(async (request) => {
  await requirePlatformContext(request)
  return jsonResponse({ data: { cleared: true } }, { headers: { "set-cookie": serializeCookie("", 0) } })
})

export const dynamic = "force-dynamic" as const
