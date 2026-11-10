import { handle, jsonResponse } from "@/core/http/response"
import { publicChatLimitRequestBody } from "@/app/api/v1/_contracts/requests-chat"
import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import {
  getPublicChatLimitStatus,
  requestPublicChatLimits,
} from "@/modules/chat-assistant/use-cases/public-chat-limits"

/** Hạn mức chat công khai của tiệm phiên: xem mức hiện tại và gửi yêu cầu nâng (Admin nền tảng duyệt). */
export const GET = handle(async (req) => {
  const { ctx } = await requireTenantContext(req)
  return jsonResponse(await getPublicChatLimitStatus(ctx))
})

export const POST = handle(async (req) => {
  const { ctx } = await requireTenantContext(req)
  requireCapability(ctx, "T4")
  const parsed = publicChatLimitRequestBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const pending = await requestPublicChatLimits(ctx, parsed.data)
  return jsonResponse({ pending }, { status: 201 })
})
