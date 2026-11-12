import { jsonResponse } from "@/core/http/response"
import { publicChatLimitRequestBody } from "@/app/api/v1/_contracts/requests-chat"
import { validationFailed } from "@/core/http/errors"
import {
  getPublicChatLimitStatus,
  requestPublicChatLimits,
} from "@/modules/chat-assistant/use-cases/public-chat-limits"
import { defineRoute } from "@/core/http/define-route"

/** Hạn mức chat công khai của tiệm phiên: xem mức hiện tại và gửi yêu cầu nâng (Admin nền tảng duyệt). */
export const GET = defineRoute({
  // Hiện trong bảng kênh chat của màn Tích hợp — cùng mã W1 (PO 12/11/2026)
  auth: { kind: "tenant", capability: "W1" },
  handler: async ({ ctx }) => {
    return jsonResponse(await getPublicChatLimitStatus(ctx))
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "T4" },
  handler: async ({ request: req, ctx }) => {
    const parsed = publicChatLimitRequestBody.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const pending = await requestPublicChatLimits(ctx, parsed.data)
    return jsonResponse({ pending }, { status: 201 })
  },
})
