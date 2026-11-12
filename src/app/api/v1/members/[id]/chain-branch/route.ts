import { notFound, validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { BranchPortalRepository } from "@/modules/greeting-card/infra/branch-portal-repository"
import { memberChainBranchBody } from "@/app/api/v1/_contracts/requests-org"
import { defineRoute } from "@/core/http/define-route"

/**
 * PUT /api/v1/members/[id]/chain-branch — gắn (hoặc gỡ: `null`) chi nhánh chuỗi cho một thành viên,
 * để tài khoản vai "Cửa hàng nhận gia công" thấy đơn của chi nhánh đó. Thành viên hoặc chi nhánh
 * không thuộc tổ chức → 404.
 */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "F5" },
  handler: async ({ request, ctx, params }) => {
    const parsed = memberChainBranchBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const { id } = params as { id: string }
    const ok = await new BranchPortalRepository().setMemberChainBranch(ctx, id, parsed.data.chain_branch_code)
    if (!ok) throw notFound()
    return jsonResponse({ data: { chainBranchCode: parsed.data.chain_branch_code } })
  },
})
