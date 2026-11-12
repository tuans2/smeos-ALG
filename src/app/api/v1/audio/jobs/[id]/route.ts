import { jsonResponse } from "@/core/http/response"
import { getAudioJob } from "@/modules/audio-studio/use-cases/get-audio-job"
import { defineRoute } from "@/core/http/define-route"

/** `GET /api/v1/audio/jobs/:id` (`I1`) — trạng thái và URL bản phối âm thanh. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse(await getAudioJob(ctx, id))
  },
})
