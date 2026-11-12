import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { renderBannerSingleCallUseCase } from "@/modules/ad-banner-poster/use-cases/render-banner-single-call.use-case"
import type { BannerAspectRatio, BannerStylePresetId } from "@/modules/ad-banner-poster/domain/banner-types"
import { bannerRenderBody } from "@/app/api/v1/_contracts/requests-tools"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const body = await request.json().catch(() => null)
    const parsed = bannerRenderBody.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }

    const { data } = parsed
    const result = await renderBannerSingleCallUseCase({
      project: {
        occasionKey: data.occasion_key,
        occasionLabel: data.occasion_label,
        industryKey: data.industry_key,
        copy: {
          headline: data.copy.headline,
          subHeadline: data.copy.subHeadline,
          promotionBadge: data.copy.promotionBadge,
          ctaText: data.copy.ctaText,
          validityText: data.copy.validityText,
        },
        productImageUrl: data.product_image_url,
        brandInfo: {
          shopName: data.brand_info.shopName,
          hotline: data.brand_info.hotline,
          address: data.brand_info.address,
          logoUrl: data.brand_info.logoUrl,
          primaryColor: data.brand_info.primaryColor,
        },
        stylePresetId: data.style_preset_id as BannerStylePresetId,
        targetFormats: data.target_formats as BannerAspectRatio[],
      },
      formats: data.target_formats as BannerAspectRatio[],
    })

    return jsonResponse({
      success: true,
      qc: result.qc,
      results: result.results,
    })
  },
})
