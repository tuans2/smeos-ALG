import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { assertCanEditCatalog } from "@/modules/greeting-card/use-cases/catalog-edit-access"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { catalogProductBody, catalogProductRemoveBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"

type Context = { params: Promise<{ id: string }> }

export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.manage },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await request.json().catch(() => ({}))
    const parsed = catalogProductBody.safeParse(body)
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    await assertCanEditCatalog(ctx, id)
    const repo = new GreetingCardRepository()
    const item = await repo.addProductToCatalog(ctx, id, parsed.data.productId)
    return jsonResponse({ data: item }, { status: 201 })
  },
})

export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.manage },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await request.json().catch(() => ({}))
    const parsed = catalogProductRemoveBody.safeParse(body)
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    await assertCanEditCatalog(ctx, id)
    const repo = new GreetingCardRepository()
    await repo.removeProductFromCatalog(ctx, id, parsed.data.productId)
    return jsonResponse({ data: { product_id: parsed.data.productId, removed: true } })
  },
})
