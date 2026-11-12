import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { readIdempotencyKey } from "@/modules/jobs/domain/idempotency"
import { createVoiceClone, listVoiceClones } from "@/modules/audio-studio/use-cases/voice-clones"
import { defineRoute } from "@/core/http/define-route"

/** `GET /api/v1/audio/voice-clones` (`I1`) — giọng nhân bản của tổ chức (24/09/2026). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ ctx }) => {
    return jsonResponse({ voice_clones: await listVoiceClones(ctx) })
  },
})

/**
 * `POST /api/v1/audio/voice-clones` (`I1`, multipart) — `name`, `consent=true`,
 * `sample` (MP3/WAV/M4A 50KB–10MB). Tạo job `audio.voice_clone` (5 credit, giá
 * tạm #64). `Idempotency-Key` bắt buộc.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const idempotencyKey = readIdempotencyKey(request)
    if (!idempotencyKey) throw validationFailed({ "Idempotency-Key": "Bắt buộc (YC-U7)" })

    const form = await request.formData().catch(() => null)
    if (!form) throw validationFailed({ body: "Cần multipart/form-data" })
    const sample = form.get("sample")
    if (!(sample instanceof Blob)) throw validationFailed({ sample: "Thiếu tệp mẫu giọng" })

    const result = await createVoiceClone(ctx, {
      name: String(form.get("name") ?? ""),
      consent: String(form.get("consent") ?? "") === "true",
      sample: new Uint8Array(await sample.arrayBuffer()),
      idempotencyKey,
    })
    return jsonResponse(result, { status: 201 })
  },
})
