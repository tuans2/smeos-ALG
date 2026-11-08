import { handle, jsonResponse } from "@/core/http/response"
import { patchStoreDefaultSchema } from "@/app/api/v1/_contracts/requests-notification"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import {
  getStoreNotificationDefaults,
  updateStoreNotificationDefault,
} from "@/modules/notification/use-cases/manage-store-defaults"
import type { NotifyChannel } from "@/modules/notification/domain/events/_contract"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F1")
  const url = new URL(request.url)
  const roleKey = url.searchParams.get("roleKey") ?? undefined

  const defaults = await getStoreNotificationDefaults(ctx.organizationId, roleKey)
  return jsonResponse({ data: defaults })
})

export const PATCH = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")
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
})
