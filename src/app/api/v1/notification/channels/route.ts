import { jsonResponse } from "@/core/http/response"
import { getPlatformChannelActivations } from "@/modules/notification/use-cases/manage-platform-policy"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "chỉ đọc trạng thái bật kênh toàn sàn" },
  handler: async ({  }) => {
    const activations = await getPlatformChannelActivations()
    return jsonResponse({ data: activations })
  },
})
