import { handle, jsonResponse } from "@/core/http/response"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import {
  listHardLocks,
  setHardLock,
  removeHardLock,
} from "@/modules/notification/use-cases/manage-hard-locks"
import type { NotifyChannel } from "@/modules/notification/domain/events/_contract"
import { removeHardLockBody, setHardLockBody } from "@/app/api/v1/platform/_contracts/requests"

export const GET = handle(async (request) => {
  await requirePlatformContext(request)
  const url = new URL(request.url)
  const eventKey = url.searchParams.get("eventKey") ?? undefined

  const locks = await listHardLocks({
    tier: "MOTHER",
    scopeId: "GLOBAL",
    eventKey,
  })

  return jsonResponse({ data: locks })
})

export const POST = handle(async (request) => {
  const platform = await requirePlatformContext(request)
  requirePlatformCapability(platform, "N2")
  const body = setHardLockBody.parse(await request.json())

  await setHardLock({
    eventKey: body.eventKey,
    channel: body.channel as NotifyChannel,
    tier: "MOTHER",
    scopeId: "GLOBAL",
    enabled: body.enabled,
    lockedBy: platform.userId,
    reason: body.reason ?? undefined,
  })

  return jsonResponse({ success: true, hardLock: body })
})

export const DELETE = handle(async (request) => {
  const pctx = await requirePlatformContext(request)
  requirePlatformCapability(pctx, "N2")
  const body = removeHardLockBody.parse(await request.json())

  await removeHardLock({
    eventKey: body.eventKey,
    channel: body.channel as NotifyChannel,
    tier: "MOTHER",
    scopeId: "GLOBAL",
    removedBy: pctx.userId,
  })

  return jsonResponse({ success: true, removed: body })
})
