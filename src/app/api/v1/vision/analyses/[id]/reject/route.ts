import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { rejectAnalysis } from "@/modules/products/use-cases/reject-analysis"
import { rejectAnalysisBody } from "@/app/api/v1/_contracts/requests-ai-studio"

/**
 * `POST /vision/analyses/:id/reject` (`H3`). Cùng mã năng lực với duyệt —
 * năng lực ở đây là "ra phán quyết trên kết quả AI", và phán quyết gồm cả
 * hai chiều. Tách ra hai mã sẽ dựng được một vai duyệt được mà không từ chối
 * được, thứ không có nghĩa trong vận hành.
 *
 * Thân yêu cầu không bắt buộc; `ly_do` nếu có thì vào `audit_logs`, chỗ duy
 * nhất còn giữ được câu trả lời cho "vì sao bản này bị bỏ".
 */
export const POST = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "H3")

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = rejectAnalysisBody.safeParse(body ?? {})
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  return jsonResponse(await rejectAnalysis(ctx, id, parsed.data.ly_do ?? null))
})
