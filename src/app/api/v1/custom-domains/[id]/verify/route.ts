/**
 * POST /api/v1/custom-domains/:id/verify (`D19`) — kiểm bản ghi TXT `_smeos-verify.<tên miền>` (checklist ALG 10.8).
 * Đúng → tên miền chuyển "Đang hoạt động" và được gửi cấp chứng chỉ HTTPS; chưa đúng → `verified: false`.
 */
import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { verifyCustomDomain } from "@/modules/custom-domain/use-cases/manage-custom-domains"
import { defineRoute } from "@/core/http/define-route"

type Ctx = { params: Promise<{ id: string }> }

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: verifyCustomDomain" },
  handler: async ({ request, ctx, params }) => {
    await enforceRateLimit(request, { scope: `custom-domain-verify:${ctx.organizationId}`, limit: 20, windowMs: 60_000 })
    const { id } = params as { id: string }
    return jsonResponse({ data: await verifyCustomDomain(ctx, id) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
