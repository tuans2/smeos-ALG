import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { createSendLink } from "@/modules/greeting-card/use-cases/create-send-link"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { resolveSaleScope } from "@/modules/greeting-card/use-cases/order-scope"
import { parseListQuery, toPage } from "@/modules/greeting-card/contracts/list-query"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { createSendLinkBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

const SESSION_STATUSES = [
  "CREATED", "OPENED", "BROWSING", "SELECTED", "ORDER_SUBMITTED", "PAYMENT_REPORTED", "COMPLETED",
] as const

export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.manage },
  handler: async ({ request, ctx }) => {
    const body = await request.json().catch(() => ({}))
    const parsed = createSendLinkBody.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }
    const input = camelKeys(parsed.data)

    const result = await createSendLink(ctx, {
      catalogId: input.catalogId,
      catalogCode: input.catalogCode,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      prefix: input.prefix,
      customCatalog: input.customCatalog
        ? {
            name: input.customCatalog.name,
            description: input.customCatalog.description,
            filters: input.customCatalog.filters,
            productIds: input.customCatalog.productIds,
          }
        : undefined,
    })
    return jsonResponse({ data: result }, { status: 201 })
  },
})

export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderRead },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    // Chế độ "chỉ của mình" ghi đè bộ lọc client gửi lên
    const saleId = (await resolveSaleScope(ctx)) ?? (url.searchParams.get("sale_id") || undefined)
    const catalogId = url.searchParams.get("catalog_id") || undefined
    const statusParam = url.searchParams.get("status") || undefined
    const status = SESSION_STATUSES.find((s) => s === statusParam)
    if (statusParam && !status) throw validationFailed({ status: `Phải là một trong: ${SESSION_STATUSES.join(", ")}` })
    const { limit, cursor } = parseListQuery(url)

    const repo = new GreetingCardRepository()
    const rows = await repo.listSessions(ctx, { saleId, catalogId, status, limit, cursor })
    return jsonResponse(toPage(rows, limit))
  },
})
