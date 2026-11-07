import { handle, jsonResponse } from "@/core/http/response"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import {
  getPlatformChannelActivations,
  updatePlatformChannelActivation,
} from "@/modules/notification/use-cases/manage-platform-policy"
import { channelActivationBody } from "@/app/api/v1/platform/_contracts/requests"

export const GET = handle(async (request) => {
  await requirePlatformContext(request)
  const activations = await getPlatformChannelActivations()
  return jsonResponse({ data: activations })
})

export const PATCH = handle(async (request) => {
  const platform = await requirePlatformContext(request)
  requirePlatformCapability(platform, "N2")
  const body = channelActivationBody.parse(await request.json())

  await updatePlatformChannelActivation({
    channel: body.channel,
    activated: body.activated,
    updatedBy: platform.userId,
  })

  return jsonResponse({ success: true, channel: body.channel, activated: body.activated })
})
