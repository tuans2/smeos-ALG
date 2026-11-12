import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { brandLibraryVersionBody } from "@/app/api/v1/_contracts/requests-brand"
import { addBrandLibraryVersion } from "@/modules/profiles/use-cases/brand-library"
import { defineRoute } from "@/core/http/define-route"

/** Thêm phiên bản mới; phiên bản cũ giữ nguyên để xem lại. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx, params }) => {
    const parsed = brandLibraryVersionBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const item = await addBrandLibraryVersion(ctx, ((params as { id: string })).id, {
      assetId: parsed.data.asset_id ?? null, textValue: parsed.data.text_value ?? null, note: parsed.data.note ?? null,
    })
    return jsonResponse({ data: item }, { status: 201 })
  },
})
