import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { bulkUpdateStatus } from "@/modules/products/use-cases/bulk-update-status"
import { activationWarningsFor } from "@/modules/products/use-cases/get-product-master-index"
import { bulkStatusBody } from "@/app/api/v1/_contracts/requests-products"
import { defineRoute } from "@/core/http/define-route"

/** `POST /products/bulk-status` (`L3`; chuyển `ARCHIVED` thêm `L4` — cùng luật `PATCH /products/:id`). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "L3" },
  handler: async ({ request, ctx }) => {
    const parsed = bulkStatusBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    if (parsed.data.status === "ARCHIVED") requireCapability(ctx, "L4")
    const result = await bulkUpdateStatus(ctx, parsed.data.ids, parsed.data.status)
    // Mở bán hàng loạt: mẫu chưa đủ điều kiện vẫn mở, kèm danh sách còn thiếu (checklist ALG 7.3)
    const warnings = parsed.data.status === "ACTIVE" ? await activationWarningsFor(ctx, result.updated) : []
    return jsonResponse({ ...result, warnings })
  },
})
