/**
 * POST /api/v1/chain/partner-stores
 *
 * Implements registration of a partner / franchise store bound by a Data Sharing Agreement (DSA).
 */

import { jsonResponse } from "@/core/http/response"
import { registerPartnerStoreBody } from "@/app/api/v1/_contracts/requests-chain"
import { registerPartnerStore } from "@/modules/field-platform/use-cases/register-partner-store"
import { validationFailed } from "@/core/http/errors"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const parsed = registerPartnerStoreBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }
    const input = camelKeys(parsed.data)

    const result = await registerPartnerStore({
      organizationId: ctx.organizationId,
      name: input.name,
      code: input.code,
      address: input.address,
      legalEntityId: input.legalEntityId,
      fieldCeilings: input.fieldCeilings,
      validUntil: input.validUntil,
    })

    return jsonResponse({ data: result }, { status: 201 })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
