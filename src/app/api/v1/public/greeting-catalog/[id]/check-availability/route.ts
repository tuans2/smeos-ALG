import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { issuesToDetails } from "@/modules/greeting-card/contracts/public-order-schema"
import { checkPublicCatalogProductAvailability } from "@/modules/greeting-card/use-cases/check-product-availability"
import { greetingCatalogAvailabilityBody } from "@/app/api/v1/public/_contracts/requests"

/**
 * POST /api/v1/public/greeting-catalog/[id]/check-availability
 * Kiểm tra khả dụng sản phẩm real-time cho form đặt hàng đa ngành.
 */
export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  await enforceRateLimit(request, { scope: "greeting-catalog-availability", limit: 120, windowMs: 60_000 })
  const { id } = await context.params

  const parsed = greetingCatalogAvailabilityBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed(issuesToDetails(parsed.error.issues))

  const result = await checkPublicCatalogProductAvailability(id, parsed.data)
  return jsonResponse(result)
})

export const dynamic = "force-dynamic"
