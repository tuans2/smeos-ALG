import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { createShareLink, listShareLinks } from "@/modules/greeting-card/use-cases/share-links"
import { shareLinkBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"

/** GET /api/v1/greeting-card/share-links — link bộ sưu tập đã sao chép (30 ngày) kèm số khách mở, số đơn. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderRead },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await listShareLinks(ctx) })
  },
})

/** POST — bấm "Sao chép" link bộ sưu tập: tạo `/s/<mã>` mang tên người đang đăng nhập. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.manage },
  handler: async ({ request, ctx }) => {
    const parsed = shareLinkBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await createShareLink(ctx, parsed.data) }, { status: 201 })
  },
})

export const dynamic = "force-dynamic"
