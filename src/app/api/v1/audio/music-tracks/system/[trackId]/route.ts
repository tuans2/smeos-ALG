import { readSystemTrack } from "@/modules/audio-studio/use-cases/music-tracks"
import { defineRoute } from "@/core/http/define-route"

/** `GET /api/v1/audio/music-tracks/system/:trackId` (`I1`) — nghe thử bài của thư viện hệ thống. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ ctx, params }) => {
    const { trackId } = params as { trackId: string }
    const { bytes, mime } = await readSystemTrack(ctx, decodeURIComponent(trackId))
    return new Response(bytes as unknown as BodyInit, {
      headers: { "content-type": mime, "content-length": String(bytes.byteLength), "cache-control": "private, max-age=3600" },
    })
  },
})
