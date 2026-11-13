import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { rejectAnalysis } from "@/modules/products/use-cases/reject-analysis"
import { rejectAnalysisBody } from "@/app/api/v1/_contracts/requests-ai-studio"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /vision/analyses/:id/reject` (`H3`). Cùng mã năng lực với duyệt —
 * năng lực ở đây là "ra phán quyết trên kết quả AI", và phán quyết gồm cả
 * hai chiều. Tách ra hai mã sẽ dựng được một vai duyệt được mà không từ chối
 * được, thứ không có nghĩa trong vận hành.
 *
 * Thân yêu cầu không bắt buộc; `ly_do` nếu có thì vào `audit_logs`, chỗ duy
 * nhất còn giữ được câu trả lời cho "vì sao bản này bị bỏ".
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "H3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await request.json().catch(() => null)
    const parsed = rejectAnalysisBody.safeParse(body ?? {})
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    return jsonResponse(await rejectAnalysis(ctx, id, parsed.data.ly_do ?? null))
  },
})
