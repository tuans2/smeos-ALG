import { handle, jsonResponse } from "@/core/http/response"
import { patchPreferenceSchema } from "@/app/api/v1/_contracts/requests-notification"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import {
  getUserNotificationPreferences,
  updateUserNotificationPreference,
} from "@/modules/notification/use-cases/manage-user-preferences"
import { listHardLocks } from "@/modules/notification/use-cases/manage-hard-locks"
import { getAppliedHardLock } from "@/modules/notification/domain/cascading-policy"
import type { NotifyChannel } from "@/modules/notification/domain/events/_contract"

export const GET = handle(async (request) => {
  const { ctx, resolved } = await requireTenantContext(request)
  const prefs = await getUserNotificationPreferences(resolved.user.id, ctx.organizationId)
  return jsonResponse({ data: prefs })
})

export const PATCH = handle(async (request) => {
  const { ctx, resolved } = await requireTenantContext(request)
  const body = patchPreferenceSchema.parse(await request.json())

  // Kiểm tra xem event có bị Hard Lock bởi Mother / Chain / Store không
  const locks = await listHardLocks({
    eventKey: body.eventKey,
  })
  const appliedLock = getAppliedHardLock(
    locks,
    body.eventKey,
    body.channel as NotifyChannel,
    "STORE",
    { storeOrgId: ctx.organizationId }
  )

  if (appliedLock) {
    return jsonResponse(
      {
        error: `Sự kiện đã bị khóa cứng bởi tầng ${appliedLock.tier}`,
        reason: appliedLock.reason,
      },
      { status: 403 }
    )
  }

  await updateUserNotificationPreference({
    userId: resolved.user.id,
    organizationId: ctx.organizationId,
    eventKey: body.eventKey,
    channel: body.channel as NotifyChannel,
    enabled: body.enabled,
    muteUntil: body.muteUntil ? new Date(body.muteUntil) : undefined,
  })

  return jsonResponse({ success: true, updated: body })
})
