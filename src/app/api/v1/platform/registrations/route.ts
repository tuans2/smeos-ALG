/**
 * GET /api/v1/platform/registrations — tài khoản tự đăng ký đang chờ duyệt (`N13`, PO 22/10/2026).
 * Xem đặc tả 06 mục 21.
 */
import { jsonResponse } from "@/core/http/response"
import { AccountApprovalRepository } from "@/modules/platform/infra/account-approval-repository"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: "N13" },
  handler: async ({ pctx }) => {
    return jsonResponse({ data: await new AccountApprovalRepository().listPending() })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
