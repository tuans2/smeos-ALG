/**
 * POST /api/v1/crm/customers/[id]/consent
 * Cập nhật sự đồng ý nhận tin tiếp thị (Consent).
 * Quyền: Q9 (RS-10 18/09 — trước đó dùng nhầm Q6, nay có mã riêng cho consent).
 */

import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { updateCustomerConsent } from "@/modules/crm/use-cases/update-customer-consent"
import { CONSENT_CHANNELS } from "@/app/api/v1/_contracts/requests-crm"

export const POST = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "Q9")

  const { id } = await context.params
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
})
