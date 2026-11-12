import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { patchMaterialBody } from "@/app/api/v1/_contracts/requests-costing"
import { updateMaterial } from "@/modules/costing/use-cases/costing-service"
import { defineRoute } from "@/core/http/define-route"

/** `PATCH /costing/materials/:id` (`L6`) — sửa nguyên liệu; đổi đơn giá thì ghi lịch sử. Khác tổ chức → 404. */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "L6" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
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
  },
})
