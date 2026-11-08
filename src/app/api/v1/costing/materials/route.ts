import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { createMaterialBody } from "@/app/api/v1/_contracts/requests-costing"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { createMaterial, listMaterialsWithAlerts } from "@/modules/costing/use-cases/costing-service"

/** `GET /costing/materials` (`L5`) — nguyên liệu của cửa hàng kèm cảnh báo biến động giá (#32). */
export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L5")
  const includeInactive = new URL(request.url).searchParams.get("include_inactive") === "true"
  return jsonResponse({ data: await listMaterialsWithAlerts(ctx, includeInactive) })
})

/** `POST /costing/materials` (`L6`) — thêm nguyên liệu; có đơn giá thì ghi mốc giá đầu tiên. */
export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L6")
  const parsed = createMaterialBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const d = parsed.data
  const material = await createMaterial(ctx, {
    name: d.name,
    unit: d.unit,
    categoryKey: d.category_key,
    unitCostVnd: d.unit_cost_vnd ?? null,
    supplierName: d.supplier_name ?? null,
    onHandQty: d.on_hand_qty ?? null,
  })
  return jsonResponse({ data: material }, { status: 201 })
})
