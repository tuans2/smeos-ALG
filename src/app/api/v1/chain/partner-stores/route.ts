/**
 * POST /api/v1/chain/partner-stores
 *
 * Implements registration of a partner / franchise store bound by a Data Sharing Agreement (DSA).
 */

import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { registerPartnerStoreBody } from "@/app/api/v1/_contracts/requests-chain"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { registerPartnerStore } from "@/modules/field-platform/use-cases/register-partner-store"
import { validationFailed } from "@/core/http/errors"

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")

  const parsed = registerPartnerStoreBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }

  const result = await registerPartnerStore({
    organizationId: ctx.organizationId,
    name: parsed.data.name,
    code: parsed.data.code,
    address: parsed.data.address,
    legalEntityId: parsed.data.legalEntityId,
    fieldCeilings: parsed.data.fieldCeilings,
    validUntil: parsed.data.validUntil,
  })

  return jsonResponse({ data: result }, { status: 201 })
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
