import { jsonResponse } from "@/core/http/response"
import {
  listHardLocks,
  setHardLock,
  removeHardLock,
} from "@/modules/notification/use-cases/manage-hard-locks"
import type { NotifyChannel } from "@/modules/notification/domain/events/_contract"
import { removeHardLockBody, setHardLockBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "chỉ đọc — mọi người vận hành nền tảng" },
  handler: async ({ request }) => {
    const url = new URL(request.url)
    const eventKey = url.searchParams.get("event_key") ?? undefined

    const locks = await listHardLocks({
      tier: "MOTHER",
      scopeId: "GLOBAL",
      eventKey,
    })

    return jsonResponse({ data: locks })
  },
})

export const POST = defineRoute({
  auth: { kind: "platform", capability: "N2" },
  body: setHardLockBody,
  handler: async ({ pctx: platform, body }) => {
    await setHardLock({
      eventKey: body.event_key,
      channel: body.channel as NotifyChannel,
      tier: "MOTHER",
      scopeId: "GLOBAL",
      enabled: body.enabled,
      lockedBy: platform.userId,
      reason: body.reason ?? undefined,
    })

    return jsonResponse({ data: body })
  },
})

export const DELETE = defineRoute({
  auth: { kind: "platform", capability: "N2" },
  body: removeHardLockBody,
  handler: async ({ pctx, body }) => {
    await removeHardLock({
      eventKey: body.event_key,
      channel: body.channel as NotifyChannel,
      tier: "MOTHER",
      scopeId: "GLOBAL",
      removedBy: pctx.userId,
    })

    return jsonResponse({ data: body })
  },
})
