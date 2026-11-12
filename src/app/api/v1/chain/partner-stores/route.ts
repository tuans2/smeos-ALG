import { jsonResponse } from "@/core/http/response"
import { registerPartnerStoreBody } from "@/app/api/v1/_contracts/requests-chain"
import { registerPartnerStore } from "@/modules/field-platform/use-cases/register-partner-store"
import { validationFailed } from "@/core/http/errors"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
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
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
