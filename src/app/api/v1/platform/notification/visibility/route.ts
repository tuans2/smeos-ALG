import { handle, jsonResponse } from "@/core/http/response"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import {
  getVisibilityMatrix,
  updateEventVisibility,
} from "@/modules/notification/use-cases/manage-event-visibility"
import type { NotificationSubTier } from "@/modules/notification/domain/events/_contract"
import { eventVisibilityBody } from "@/app/api/v1/platform/_contracts/requests"

export const GET = handle(async (request) => {
  await requirePlatformContext(request)
  const matrix = await getVisibilityMatrix()
  return jsonResponse({ data: matrix })
})

export const PATCH = handle(async (request) => {
  const platform = await requirePlatformContext(request)
  requirePlatformCapability(platform, "N2")
  const body = eventVisibilityBody.parse(await request.json())

  await updateEventVisibility({
    eventKey: body.eventKey,
    tier: body.tier as NotificationSubTier,
    visible: body.visible,
    updatedBy: platform.userId,
  })

  return jsonResponse({ success: true, updated: body })
})
