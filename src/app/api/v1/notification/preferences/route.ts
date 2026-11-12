import { AppError } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { patchPreferenceSchema } from "@/app/api/v1/_contracts/requests-notification"
import {
  getUserNotificationPreferences,
  updateUserNotificationPreference,
} from "@/modules/notification/use-cases/manage-user-preferences"
import { listHardLocks } from "@/modules/notification/use-cases/manage-hard-locks"
import { getLockForUserPreference } from "@/modules/notification/domain/cascading-policy"
import type { NotifyChannel } from "@/modules/notification/domain/events/_contract"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "tuỳ chọn nhận thông báo của chính mình" },
  handler: async ({ ctx, resolved }) => {
    const prefs = await getUserNotificationPreferences(resolved.user.id, ctx.organizationId)
    return jsonResponse({ data: prefs })
  },
})

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "tuỳ chọn nhận thông báo của chính mình" },
  handler: async ({ request, ctx, resolved }) => {
    const body = patchPreferenceSchema.parse(await request.json())

    // Khoá cứng Mother / Ngành / Chuỗi / Cửa hàng — kể cả khoá tầng cửa hàng (audit API §15: trước đây bỏ qua, tuỳ
    // chọn lưu được nhưng không có hiệu lực vì luật gửi vẫn áp khoá đó)
    const locks = await listHardLocks({ eventKey: body.eventKey })
    const appliedLock = getLockForUserPreference(locks, body.eventKey, body.channel as NotifyChannel, { storeOrgId: ctx.organizationId })

    if (appliedLock) {
      // Cấp trên đã khoá — cùng mã với tích hợp/kênh bán (`LOCKED_BY_UPPER`)
      throw new AppError("UNPROCESSABLE_ENTITY", `Sự kiện đã bị khóa cứng bởi tầng ${appliedLock.tier}`, {
        violation: "LOCKED_BY_UPPER",
        tier: appliedLock.tier,
        reason: appliedLock.reason,
      })
    }

    await updateUserNotificationPreference({
      userId: resolved.user.id,
      organizationId: ctx.organizationId,
      eventKey: body.eventKey,
      channel: body.channel as NotifyChannel,
      enabled: body.enabled,
      muteUntil: body.muteUntil ? new Date(body.muteUntil) : undefined,
    })

    return jsonResponse({ data: body })
  },
})
