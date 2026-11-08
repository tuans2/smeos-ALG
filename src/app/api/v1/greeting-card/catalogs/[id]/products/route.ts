import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { assertCanEditCatalog } from "@/modules/greeting-card/use-cases/catalog-edit-access"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { catalogProductBody, catalogProductRemoveBody } from "@/app/api/v1/_contracts/requests-greeting"

type Context = { params: Promise<{ id: string }> }

export const POST = handle(async (request: Request, context: Context) => {
  const { id } = await context.params
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.manage)
  const body = await request.json().catch(() => ({}))
  const parsed = catalogProductBody.safeParse(body)
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  await assertCanEditCatalog(ctx, id)
  const repo = new GreetingCardRepository()
  const item = await repo.addProductToCatalog(ctx, id, parsed.data.productId)
  return jsonResponse({ data: item }, { status: 201 })
})

export const DELETE = handle(async (request: Request, context: Context) => {
  const { id } = await context.params
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.manage)
  const body = await request.json().catch(() => ({}))
  const parsed = catalogProductRemoveBody.safeParse(body)
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  await assertCanEditCatalog(ctx, id)
  const repo = new GreetingCardRepository()
  await repo.removeProductFromCatalog(ctx, id, parsed.data.productId)
  return jsonResponse({ success: true })
})
