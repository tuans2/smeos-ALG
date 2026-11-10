import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { patchMaterialBody } from "@/app/api/v1/_contracts/requests-costing"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { updateMaterial } from "@/modules/costing/use-cases/costing-service"

/** `PATCH /costing/materials/:id` (`L6`) — sửa nguyên liệu; đổi đơn giá thì ghi lịch sử. Khác tổ chức → 404. */
export const PATCH = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L6")
  const { id } = await context.params
  const parsed = patchMaterialBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const d = parsed.data
  const material = await updateMaterial(ctx, id, {
    ...(d.name !== undefined ? { name: d.name } : {}),
    ...(d.unit !== undefined ? { unit: d.unit } : {}),
    ...(d.category_key !== undefined ? { categoryKey: d.category_key } : {}),
    ...(d.unit_cost_vnd !== undefined ? { unitCostVnd: d.unit_cost_vnd } : {}),
    ...(d.supplier_name !== undefined ? { supplierName: d.supplier_name } : {}),
    ...(d.on_hand_qty !== undefined ? { onHandQty: d.on_hand_qty } : {}),
    ...(d.active !== undefined ? { active: d.active } : {}),
  })
  return jsonResponse({ data: material })
})
