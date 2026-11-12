/**
 * DELETE /api/v1/custom-domains/:id (`D19`) — gỡ tên miền riêng (checklist ALG 10.8). Tên miền của tổ chức
 * khác → 404; tên miền đang bị nền tảng khoá → 409.
 */
import { jsonResponse } from "@/core/http/response"
import { removeCustomDomain } from "@/modules/custom-domain/use-cases/manage-custom-domains"
import { defineRoute } from "@/core/http/define-route"

type Ctx = { params: Promise<{ id: string }> }

export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: removeCustomDomain" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    await removeCustomDomain(ctx, id)
    return jsonResponse({ data: { removed: true } })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
