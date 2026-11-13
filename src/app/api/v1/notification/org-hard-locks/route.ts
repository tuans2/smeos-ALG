import { jsonResponse } from "@/core/http/response"
import { deleteHardLockSchema, postHardLockSchema } from "@/app/api/v1/_contracts/requests-notification"
import {
  listHardLocks,
  setHardLock,
  removeHardLock,
} from "@/modules/notification/use-cases/manage-hard-locks"
import type { NotifyChannel } from "@/modules/notification/domain/events/_contract"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => {
    const locks = await listHardLocks({
      tier: "CHAIN",
      scopeId: ctx.organizationId,
    })
    return jsonResponse({ data: locks })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  body: postHardLockSchema,
  handler: async ({ ctx, resolved, body }) => {
    await setHardLock({
      eventKey: body.event_key,
      channel: body.channel as NotifyChannel,
      tier: "CHAIN",
      scopeId: ctx.organizationId,
      enabled: body.enabled,
      lockedBy: resolved.user.id,
      reason: body.reason ?? undefined,
    })

    return jsonResponse({ data: body })
  },
})

export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  body: deleteHardLockSchema,
  handler: async ({ ctx, body }) => {
    await removeHardLock({
      eventKey: body.event_key,
      channel: body.channel as NotifyChannel,
      tier: "CHAIN",
      scopeId: ctx.organizationId,
      removedBy: ctx.userId,
    })

    return jsonResponse({ data: body })
  },
})
