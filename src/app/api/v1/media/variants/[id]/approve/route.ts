import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { approveVariant } from "@/modules/media/use-cases/approve-variant"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { approveVariantBody } from "@/app/api/v1/_contracts/requests-media"

/**
 * `POST /media/variants/:id/approve` (`I5`).
 *
 * `asset_id` bắt buộc, không có mặc định "duyệt hết": một lượt M04b sinh
 * nhiều biến thể và người bán thường chỉ đăng một tấm.
 */
export const POST = handle(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { ctx } = await requireTenantContext(request)
    requireCapability(ctx, "I5")

    const parsed = approveVariantBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const { id } = await params
    return jsonResponse(await approveVariant(ctx, id, parsed.data.asset_id))
  }
)
