/**
 * GET /api/v1/platform/jobs/failed — hàng đợi lỗi xuyên tổ chức (`N5`, ROADMAP E5.2).
 * Không trả payload/output của job.
 */
import { jsonResponse } from "@/core/http/response"
import { listFailedJobsForOps } from "@/modules/platform/use-cases/manage-failed-jobs"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx }) => {
    return jsonResponse({ data: await listFailedJobsForOps(pctx) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
