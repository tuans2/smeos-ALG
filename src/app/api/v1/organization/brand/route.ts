import { jsonResponse } from "@/core/http/response"
import { getOrganizationBrand } from "@/modules/organization/use-cases/get-organization-brand"
import { updateOrganizationBrand } from "@/modules/organization/use-cases/update-organization-brand"
import { defineRoute } from "@/core/http/define-route"

/**
 * GET /api/v1/organization/brand — Xem cấu hình thương hiệu tổ chức (`F1`).
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => {
    return jsonResponse(await getOrganizationBrand(ctx))
  },
})

/**
 * PUT /api/v1/organization/brand — Cập nhật cấu hình thương hiệu (`F2`).
 * Kiểm tra tương phản WCAG 2.2 AA (>= 4.5:1), trả 422 nếu không đạt.
 */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const body = await request.json().catch(() => ({}))
    return jsonResponse(await updateOrganizationBrand(ctx, body))
  },
})

/**
 * PATCH /api/v1/organization/brand — Cập nhật cấu hình thương hiệu (`F2`).
 */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const body = await request.json().catch(() => ({}))
    return jsonResponse(await updateOrganizationBrand(ctx, body))
  },
})

