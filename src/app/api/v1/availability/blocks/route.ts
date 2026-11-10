import { handle, jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { requireCapability } from "@/core/rbac/capabilities"
import { createManualBlock } from "@/modules/availability/use-cases/manage-manual-block"
import { availabilityBlockBody } from "@/app/api/v1/_contracts/requests-product-extra"

/**
 * POST /api/v1/availability/blocks
 * Admin chặn ngày thủ công (bảo trì, giữ chỗ riêng, đóng cửa).
 */
export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L3")

  const parsed = availabilityBlockBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }

  const id = await createManualBlock({
    organizationId: ctx.organizationId,
    productId: parsed.data.productId,
    checkInDate: parsed.data.checkInDate,
    checkOutDate: parsed.data.checkOutDate,
    note: parsed.data.note,
  })

  return jsonResponse({ id, success: true })
})

export const dynamic = "force-dynamic"
