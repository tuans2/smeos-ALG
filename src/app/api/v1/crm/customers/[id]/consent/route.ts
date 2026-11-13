/**
 * POST /api/v1/crm/customers/[id]/consent
 * Cập nhật sự đồng ý nhận tin tiếp thị (Consent).
 * Quyền: Q9 (RS-10 18/09 — trước đó dùng nhầm Q6, nay có mã riêng cho consent).
 */

import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { updateCustomerConsent } from "@/modules/crm/use-cases/update-customer-consent"
import { CONSENT_CHANNELS } from "@/app/api/v1/_contracts/requests-crm"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "Q9" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await request.json()

    if (!CONSENT_CHANNELS.includes(body.channel)) {
      throw validationFailed({ channel: `Kênh phải thuộc: ${CONSENT_CHANNELS.join(", ")}` })
    }

    const consent = await updateCustomerConsent(
      ctx,
      id,
      body.channel,
      Boolean(body.granted)
    )

    return jsonResponse({ consent })
  },
})
