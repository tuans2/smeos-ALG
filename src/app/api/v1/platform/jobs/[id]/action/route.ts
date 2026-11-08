/**
 * POST /api/v1/platform/jobs/:id/action — chạy lại (`RETRY`) hoặc gác lại (`DISMISS`) một job lỗi
 * (`N15`, ROADMAP E5.2). Ghi nhật ký nền tảng; job không còn FAILED → 404.
 */

import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { actOnFailedJob } from "@/modules/platform/use-cases/manage-failed-jobs"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { failedJobActionBody } from "@/app/api/v1/platform/_contracts/requests"

export const POST = handle(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const pctx = await requirePlatformContext(request)
  const parsed = failedJobActionBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const { id } = await params
  return jsonResponse({ data: await actOnFailedJob(pctx, { jobId: id, action: parsed.data.action }) })
})
