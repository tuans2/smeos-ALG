import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { updateLinkCustomer } from "@/modules/greeting-card/use-cases/link-customer"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { linkCustomerBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

/** PATCH /api/v1/greeting-card/send-links/[id]/customer — ghi tên/SĐT khách lên link chưa có đơn. */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.manage },
  handler: async ({ request, ctx, params }) => {
    const parsed = linkCustomerBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const input = camelKeys(parsed.data)
    const { id } = params as { id: string }
    return jsonResponse({ data: await updateLinkCustomer(ctx, id, input) })
  },
})
