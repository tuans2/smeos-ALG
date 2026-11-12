import { jsonResponse } from "@/core/http/response"
import { deleteMusicTrack } from "@/modules/audio-studio/use-cases/music-tracks"
import { defineRoute } from "@/core/http/define-route"

/** `DELETE /api/v1/audio/music-tracks/:id` (`I1`) — gỡ bài tiệm đã tải (`org:<uuid>` hoặc `<uuid>`). */
export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    await deleteMusicTrack(ctx, decodeURIComponent(id))
    return jsonResponse({ ok: true })
  },
})
