import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { priceListActiveBody } from "@/app/api/v1/_contracts/requests-costing"
import {
  archivePriceList,
  getPriceListDocument,
  savePriceList,
  setPriceListActive,
} from "@/modules/products/use-cases/price-lists"

import { priceListBodySchema, toPriceListInput } from "../schema"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `GET /price-lists/:id` (`L1`) — bảng giá dựng sẵn để xem/in. Bảng của tổ chức khác → 404. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "L1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse(await getPriceListDocument(ctx, id))
  },
})

/** `PUT /price-lists/:id` (`L3`) — sửa toàn bộ cấu hình. */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "L3" },
  handler: async ({ request, ctx, params }) => {
    const parsed = priceListBodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const { id } = params as { id: string }
    return jsonResponse(await savePriceList(ctx, id, toPriceListInput(parsed.data)))
  },
})

/** `PATCH /price-lists/:id` (`L3`) — công tắc Đang dùng. */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "L3" },
  handler: async ({ request, ctx, params }) => {
    const parsed = priceListActiveBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const { id } = params as { id: string }
    return jsonResponse(await setPriceListActive(ctx, id, parsed.data.active))
  },
})

/** `DELETE /price-lists/:id` (`L3`) — bỏ khỏi danh sách, lịch sử phiên bản vẫn giữ. */
export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: "L3" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    await archivePriceList(ctx, id)
    return jsonResponse({ ok: true })
  },
})
