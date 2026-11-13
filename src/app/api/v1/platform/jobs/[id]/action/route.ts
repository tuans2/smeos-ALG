/**
 * POST /api/v1/platform/jobs/:id/action — chạy lại (`RETRY`) hoặc gác lại (`DISMISS`) một job lỗi
 * (`N15`, ROADMAP E5.2). Ghi nhật ký nền tảng; job không còn FAILED → 404.
 */

import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { actOnFailedJob } from "@/modules/platform/use-cases/manage-failed-jobs"
import { failedJobActionBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx, params }) => {
    const parsed = failedJobActionBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const { id } = params as { id: string }
    return jsonResponse({ data: await actOnFailedJob(pctx, { jobId: id, action: parsed.data.action }) })
  },
})
