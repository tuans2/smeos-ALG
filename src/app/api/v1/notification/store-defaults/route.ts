import { jsonResponse } from "@/core/http/response"
import { patchStoreDefaultSchema } from "@/app/api/v1/_contracts/requests-notification"
import {
  getStoreNotificationDefaults,
  updateStoreNotificationDefault,
} from "@/modules/notification/use-cases/manage-store-defaults"
import type { NotifyChannel } from "@/modules/notification/domain/events/_contract"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const roleKey = url.searchParams.get("roleKey") ?? undefined

    const defaults = await getStoreNotificationDefaults(ctx.organizationId, roleKey)
    return jsonResponse({ data: defaults })
  },
})

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const body = patchStoreDefaultSchema.parse(await request.json())

    await updateStoreNotificationDefault({
      organizationId: ctx.organizationId,
      eventKey: body.eventKey,
      channel: body.channel as NotifyChannel,
      roleKey: body.roleKey,
      enabled: body.enabled,
      scheduleStart: body.scheduleStart ?? undefined,
      scheduleEnd: body.scheduleEnd ?? undefined,
    })

    return jsonResponse({ success: true, updated: body })
  },
})
