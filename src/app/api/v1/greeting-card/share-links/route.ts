import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { createShareLink, listShareLinks } from "@/modules/greeting-card/use-cases/share-links"
import { shareLinkBody } from "@/app/api/v1/_contracts/requests-greeting"

/** GET /api/v1/greeting-card/share-links — link bộ sưu tập đã sao chép (30 ngày) kèm số khách mở, số đơn. */
export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.orderRead)
  return jsonResponse({ data: await listShareLinks(ctx) })
})

/** POST — bấm "Sao chép" link bộ sưu tập: tạo `/s/<mã>` mang tên người đang đăng nhập. */
export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.manage)
  const parsed = shareLinkBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await createShareLink(ctx, parsed.data) }, { status: 201 })
})

export const dynamic = "force-dynamic"
