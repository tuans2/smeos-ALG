import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { listPriceLists, savePriceList } from "@/modules/products/use-cases/price-lists"

import { priceListBodySchema, toPriceListInput } from "./schema"
import { defineRoute } from "@/core/http/define-route"

/** `GET /price-lists` (`L1`) — bảng giá sản phẩm của cửa hàng. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "L1" },
  handler: async ({ ctx }) => {
    return jsonResponse(await listPriceLists(ctx))
  },
})

/** `POST /price-lists` (`L3`) — tạo bảng giá mới. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "L3" },
  handler: async ({ request, ctx }) => {
    const parsed = priceListBodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse(await savePriceList(ctx, null, toPriceListInput(parsed.data)), { status: 201 })
  },
})
