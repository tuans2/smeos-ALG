import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { approveCampaignPackage } from "@/modules/creative-production/use-cases/manage-campaign-package"
import { approveBodySchema } from "@/modules/creative-production/contracts/stage-09-approve"
import { defineRoute } from "@/core/http/define-route"

/** Hợp đồng Chặng 09 — nguồn chuẩn ở `contracts/stage-09-approve.ts`. */
const schema = approveBodySchema

/**
 * `POST /api/v1/creative-production/packages/:id/approve` (`J5` social.publish) —
 * Chặng 09. Endpoint duyệt tách khỏi endpoint sinh kết quả; ghi `audit_logs`
 * trong CÙNG giao dịch với việc chuyển trạng thái.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "J5" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = schema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse(
      await approveCampaignPackage(ctx, id, { acknowledgeWarnings: parsed.data.acknowledge_warnings })
    )
  },
})
