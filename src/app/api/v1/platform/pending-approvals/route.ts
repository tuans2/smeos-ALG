/**
 * GET /api/v1/platform/pending-approvals
 * Trả về tất cả yêu cầu chờ Admin SaaS phê duyệt (mở khóa ngôn ngữ, chuyển đổi mô hình...).
 * Chỉ dành cho platform operator — yêu cầu capability N1.
 */
import { jsonResponse } from "@/core/http/response"
import { getPendingApprovals } from "@/modules/platform/use-cases/list-pending-approvals"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx }) => {
    const items = await getPendingApprovals(pctx)
    return jsonResponse({ data: items, total: items.length })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
