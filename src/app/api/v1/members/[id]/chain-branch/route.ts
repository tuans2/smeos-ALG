import { notFound, validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { BranchPortalRepository } from "@/modules/greeting-card/infra/branch-portal-repository"
import { memberChainBranchBody } from "@/app/api/v1/_contracts/requests-org"

/**
 * PUT /api/v1/members/[id]/chain-branch — gắn (hoặc gỡ: `null`) chi nhánh chuỗi cho một thành viên,
 * để tài khoản vai "Cửa hàng nhận gia công" thấy đơn của chi nhánh đó. Thành viên hoặc chi nhánh
 * không thuộc tổ chức → 404.
 */
export const PUT = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F5")

  const parsed = memberChainBranchBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const { id } = await context.params
  const ok = await new BranchPortalRepository().setMemberChainBranch(ctx, id, parsed.data.chain_branch_code)
  if (!ok) throw notFound()
  return jsonResponse({ data: { chainBranchCode: parsed.data.chain_branch_code } })
})
