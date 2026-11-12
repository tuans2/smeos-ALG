
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { uploadUrlBody } from "@/app/api/v1/_contracts/requests-storage"
import { createUploadUrl } from "@/modules/assets/use-cases/create-upload-url"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "G2" },
  handler: async ({ request, ctx }) => {
    const parsed = uploadUrlBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const result = await createUploadUrl(ctx, {
      productId: parsed.data.product_id ?? null,
      mimeType: parsed.data.mime_type,
    })
    return jsonResponse(result, { status: 201 })
  },
})
