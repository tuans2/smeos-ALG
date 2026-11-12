import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { downloadVariant } from "@/modules/media/use-cases/download-variant"
import { defineRoute } from "@/core/http/define-route"

/**
 * `GET /media/variants/:id/download?asset_id=…` (`I3`).
 *
 * Gác bằng `I3` chứ không `I5`: tải về và duyệt là hai việc, hai mã năng lực
 * (M04 mục 5.1).
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I3" },
  handler: async ({ request, ctx, params }) => {
      const assetId = new URL(request.url).searchParams.get("asset_id")
      if (!assetId) throw validationFailed({ asset_id: "Bắt buộc — một lượt có nhiều biến thể" })

      const { id } = params as { id: string }
      return jsonResponse(await downloadVariant(ctx, id, assetId))
  },
})
