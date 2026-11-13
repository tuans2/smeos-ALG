import { jsonResponse } from "@/core/http/response"
import { BranchPortalRepository } from "@/modules/greeting-card/infra/branch-portal-repository"
import { defineRoute } from "@/core/http/define-route"

/** GET /api/v1/members/chain-branches — chi nhánh chuỗi của tổ chức, để chọn khi gắn tài khoản cửa hàng. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F5" },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await new BranchPortalRepository().listChainBranches(ctx) })
  },
})
