import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { promoteOriginalToMaster } from "@/modules/media/use-cases/promote-to-master"
import { promoteToMasterBody } from "@/app/api/v1/_contracts/requests-media"

/**
 * `POST /api/v1/media/promote-to-master` (`I2`) — Skip M04a, duyệt nhanh ảnh
 * ORIGINAL thành MASTER 1-chạm.
 *
 * Năng lực: `I2` (cùng năng lực approve hiện có — vì bản chất đây là duyệt
 * ảnh nhanh, chỉ bỏ qua bước Identity Guard).
 *
 * Body: `{ asset_id: string }`
 * Response 201: `{ master_asset_id: string, approval_state: "APPROVED" }`
 */
export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "I2")

  const parsed = promoteToMasterBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const result = await promoteOriginalToMaster(ctx, parsed.data.asset_id)

  return jsonResponse(result, { status: 201 })
})
