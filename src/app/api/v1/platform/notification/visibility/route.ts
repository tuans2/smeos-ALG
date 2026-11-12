import { jsonResponse } from "@/core/http/response"
import {
  getVisibilityMatrix,
  updateEventVisibility,
} from "@/modules/notification/use-cases/manage-event-visibility"
import type { NotificationSubTier } from "@/modules/notification/domain/events/_contract"
import { eventVisibilityBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "chỉ đọc — mọi người vận hành nền tảng" },
  handler: async ({  }) => {
    const matrix = await getVisibilityMatrix()
    return jsonResponse({ data: matrix })
  },
})

export const PATCH = defineRoute({
  auth: { kind: "platform", capability: "N2" },
  handler: async ({ request, pctx: platform }) => {
    const body = eventVisibilityBody.parse(await request.json())

    await updateEventVisibility({
      eventKey: body.eventKey,
      tier: body.tier as NotificationSubTier,
      visible: body.visible,
      updatedBy: platform.userId,
    })

    return jsonResponse({ data: body })
  },
})
