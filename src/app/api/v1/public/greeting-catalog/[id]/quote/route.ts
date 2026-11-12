import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { issuesToDetails } from "@/modules/greeting-card/contracts/public-order-schema"
import { quotePublicCatalog } from "@/modules/greeting-card/use-cases/submit-public-catalog-order"
import { greetingCatalogQuoteBody } from "@/app/api/v1/public/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

/** POST /api/v1/public/greeting-catalog/[id]/quote — báo giá trên link bộ sưu tập công khai. */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "greeting-catalog-quote", limit: 60, windowMs: 60_000, per: "ip" },
  handler: async ({ request, params }) => {
    const { id } = params as { id: string }
    const parsed = greetingCatalogQuoteBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed(issuesToDetails(parsed.error.issues))
    const { productId, ...req } = parsed.data
    const { quote, errors, fullSlots } = await quotePublicCatalog(id, productId, req)
    return jsonResponse({ quote, errors, fullSlots: fullSlots ?? [] })
  },
})

export const dynamic = "force-dynamic"
