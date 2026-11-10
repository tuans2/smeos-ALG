import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { saveBannerToLibraryUseCase } from "@/modules/ad-banner-poster/use-cases/save-banner-to-library.use-case"
import { bannerSaveBody } from "@/app/api/v1/_contracts/requests-tools"

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "G2")

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
})

