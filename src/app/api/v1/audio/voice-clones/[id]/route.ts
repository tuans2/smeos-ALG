import { jsonResponse } from "@/core/http/response"
import { deleteVoiceClone, getVoiceClone } from "@/modules/audio-studio/use-cases/voice-clones"
import { defineRoute } from "@/core/http/define-route"

/** `GET /api/v1/audio/voice-clones/:id` (`I1`) — trạng thái + URL nghe mẫu (ký 1 giờ). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ voice_clone: await getVoiceClone(ctx, id) })
  },
})

/** `DELETE /api/v1/audio/voice-clones/:id` (`I1`) — gỡ giọng trên ElevenLabs và đánh dấu `DELETED`. */
export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse(await deleteVoiceClone(ctx, id))
  },
})
