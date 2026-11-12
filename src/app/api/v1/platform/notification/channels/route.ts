import { jsonResponse } from "@/core/http/response"
import {
  getPlatformChannelActivations,
  updatePlatformChannelActivation,
} from "@/modules/notification/use-cases/manage-platform-policy"
import { channelActivationBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "chỉ đọc — mọi người vận hành nền tảng" },
  handler: async ({  }) => {
    const activations = await getPlatformChannelActivations()
    return jsonResponse({ data: activations })
  },
})

export const PATCH = defineRoute({
  auth: { kind: "platform", capability: "N2" },
  handler: async ({ request, pctx: platform }) => {
    const body = channelActivationBody.parse(await request.json())

    await updatePlatformChannelActivation({
      channel: body.channel,
      activated: body.activated,
      updatedBy: platform.userId,
    })

    return jsonResponse({ data: { channel: body.channel, activated: body.activated } })
  },
})
