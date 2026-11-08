import { z } from "zod"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import {
  listHardLocks,
  setHardLock,
  removeHardLock,
} from "@/modules/notification/use-cases/manage-hard-locks"
import type { NotifyChannel } from "@/modules/notification/domain/events/_contract"

const postHardLockSchema = z.object({
  eventKey: z.string().min(1),
  channel: z.enum([
    "APP_INBOX",
    "EMAIL",
    "PUSH",
    "TELEGRAM",
    "ZALO",
    "SMS",
    "WHATSAPP",
    "MESSENGER",
  ]),
  enabled: z.boolean(),
  reason: z.string().optional(),
})

const deleteHardLockSchema = z.object({
  eventKey: z.string().min(1),
  channel: z.enum([
    "APP_INBOX",
    "EMAIL",
    "PUSH",
    "TELEGRAM",
    "ZALO",
    "SMS",
    "WHATSAPP",
    "MESSENGER",
  ]),
})

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F1")
  const locks = await listHardLocks({
    tier: "CHAIN",
    scopeId: ctx.organizationId,
  })
  return jsonResponse({ data: locks })
})

export const POST = handle(async (request) => {
  const { ctx, resolved } = await requireTenantContext(request)
  requireCapability(ctx, "F2")
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

  return jsonResponse({ success: true, hardLock: body })
})

export const DELETE = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")
  const body = deleteHardLockSchema.parse(await request.json())

  await removeHardLock({
    eventKey: body.eventKey,
    channel: body.channel as NotifyChannel,
    tier: "CHAIN",
    scopeId: ctx.organizationId,
    removedBy: ctx.userId,
  })

  return jsonResponse({ success: true, removed: body })
})
