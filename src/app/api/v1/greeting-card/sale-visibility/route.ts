import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { getSaleVisibility, setSaleVisibility } from "@/modules/greeting-card/use-cases/sale-visibility"
import { saleVisibilityBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

/** GET /api/v1/greeting-card/sale-visibility — mặc định + lựa chọn riêng từng sale (F2). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.integrationManage },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await getSaleVisibility(ctx) })
  },
})

/** PUT — `{ mode }` đổi mặc định; `{ userId, mode }` chọn riêng; `mode: null` bỏ chọn riêng. */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.integrationManage },
  handler: async ({ request, ctx }) => {
    const parsed = saleVisibilityBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const input = camelKeys(parsed.data)
    if (!input.userId && !input.mode) throw validationFailed({ mode: "Chọn chế độ mặc định" })
    return jsonResponse({ data: await setSaleVisibility(ctx, input) })
  },
})
