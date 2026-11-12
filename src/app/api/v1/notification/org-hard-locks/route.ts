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
  handler: async ({ request, ctx, resolved }) => {
    const body = postHardLockSchema.parse(await request.json())

    await setHardLock({
      eventKey: body.eventKey,
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
  handler: async ({ request, ctx }) => {
    const body = deleteHardLockSchema.parse(await request.json())

    await removeHardLock({
      eventKey: body.eventKey,
      channel: body.channel as NotifyChannel,
      tier: "CHAIN",
      scopeId: ctx.organizationId,
      removedBy: ctx.userId,
    })

    return jsonResponse({ data: body })
  },
})
