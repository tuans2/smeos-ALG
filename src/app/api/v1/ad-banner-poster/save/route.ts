import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { saveBannerToLibraryUseCase } from "@/modules/ad-banner-poster/use-cases/save-banner-to-library.use-case"
import { bannerSaveBody } from "@/app/api/v1/_contracts/requests-tools"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "G2" },
  handler: async ({ request, ctx }) => {
    const body = await request.json().catch(() => null)
    const parsed = bannerSaveBody.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }

    const { data } = parsed
    const result = await saveBannerToLibraryUseCase(ctx, {
      title: data.title,
      assetTypeCode: data.asset_type_code,
      imageData: data.image_data,
      productId: data.product_id,
      width: data.width,
      height: data.height,
      metadata: data.metadata,
    })

    return jsonResponse(result, { status: 201 })
  },
})

