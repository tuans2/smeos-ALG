import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { priceListActiveBody } from "@/app/api/v1/_contracts/requests-costing"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import {
  archivePriceList,
  getPriceListDocument,
  savePriceList,
  setPriceListActive,
} from "@/modules/products/use-cases/price-lists"

import { priceListBodySchema, toPriceListInput } from "../schema"

type Params = { params: Promise<{ id: string }> }

/** `GET /price-lists/:id` (`L1`) — bảng giá dựng sẵn để xem/in. Bảng của tổ chức khác → 404. */
export const GET = handle(async (request, context: Params) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L1")
  const { id } = await context.params
  return jsonResponse(await getPriceListDocument(ctx, id))
})

/** `PUT /price-lists/:id` (`L3`) — sửa toàn bộ cấu hình. */
export const PUT = handle(async (request, context: Params) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L3")
  const parsed = priceListBodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const { id } = await context.params
  return jsonResponse(await savePriceList(ctx, id, toPriceListInput(parsed.data)))
})

/** `PATCH /price-lists/:id` (`L3`) — công tắc Đang dùng. */
export const PATCH = handle(async (request, context: Params) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L3")
  const parsed = priceListActiveBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const { id } = await context.params
  return jsonResponse(await setPriceListActive(ctx, id, parsed.data.active))
})

/** `DELETE /price-lists/:id` (`L3`) — bỏ khỏi danh sách, lịch sử phiên bản vẫn giữ. */
export const DELETE = handle(async (request, context: Params) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L3")
  const { id } = await context.params
  await archivePriceList(ctx, id)
  return jsonResponse({ ok: true })
})
