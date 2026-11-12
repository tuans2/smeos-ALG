import { notFound, validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"
import { chainBranchPatchBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"

/**
 * PATCH /api/v1/greeting-card/chain-branches/[branchCode]  `{ isActive }`
 * Bật / tạm dừng đối tác. Tạm dừng → không được sàng lọc mời nhận đơn. Mã không thuộc tổ chức → 404.
 */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.assignFlorist },
  handler: async ({ request, ctx, params }) => {
    const parsed = chainBranchPatchBody.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const { branchCode } = params as { branchCode: string }
    const updated = await new ChainBranchRepository().setActive(ctx.organizationId, branchCode, parsed.data.isActive)
    if (!updated) throw notFound()
    return jsonResponse({ data: { branchCode, isActive: parsed.data.isActive } })
  },
})

export const dynamic = "force-dynamic"
