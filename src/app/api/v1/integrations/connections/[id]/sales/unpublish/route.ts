/** POST /api/v1/integrations/connections/:id/sales/unpublish — { productIds } tối đa 100 (W3). */

import { jsonResponse } from "@/core/http/response"
import { salesProductsBody } from "@/app/api/v1/_contracts/requests-integrations"
import { validationFailed } from "@/core/http/errors"
import { unpublishProducts } from "@/modules/integration-hub/use-cases/sales-channel"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: unpublishProducts" },
  handler: async ({ request: req, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = salesProductsBody.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ productIds: "Chọn từ 1 đến 100 sản phẩm" })
    await unpublishProducts(ctx, { connectionId: id, productIds: parsed.data.productIds })
    return jsonResponse({ ok: true })
  },
})
