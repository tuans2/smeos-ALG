/** POST /api/v1/integrations/connections/:id/sales/publish — { productIds } tối đa 100 (W3). */

import { handle, jsonResponse } from "@/core/http/response"
import { salesProductsBody } from "@/app/api/v1/_contracts/requests-integrations"
import { validationFailed } from "@/core/http/errors"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { publishProducts } from "@/modules/integration-hub/use-cases/sales-channel"

export const POST = handle(async (req, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(req)
  const { id } = await context.params
  const parsed = salesProductsBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ productIds: "Chọn từ 1 đến 100 sản phẩm" })
  return jsonResponse({ listings: await publishProducts(ctx, { connectionId: id, productIds: parsed.data.productIds }) })
})
