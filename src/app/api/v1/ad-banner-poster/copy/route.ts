import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { generateBannerCopyUseCase } from "@/modules/ad-banner-poster/use-cases/generate-banner-copy.use-case"
import { listActiveShopPromotions } from "@/modules/greeting-card/use-cases/active-shop-promotions"
import { bannerCopyBody } from "@/app/api/v1/_contracts/requests-tools"
import { defineRoute } from "@/core/http/define-route"

/** Ưu đãi tiệm đang bật — ấn phẩm chỉ được in các ưu đãi này. */
const shopPromotionTitles = async (organizationId: string) =>
  (await listActiveShopPromotions(organizationId).catch(() => [])).map((p) => p.title)

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ ctx }) => {
    return jsonResponse({ promotions: await shopPromotionTitles(ctx.organizationId) })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "I1" },
  handler: async ({ request, ctx }) => {
    const body = await request.json().catch(() => null)
    const parsed = bannerCopyBody.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }

    const result = await generateBannerCopyUseCase({
      industryKey: parsed.data.industry_key,
      occasionKey: parsed.data.occasion_key,
      occasionLabel: parsed.data.occasion_label,
      shopName: parsed.data.shop_name,
      productTitle: parsed.data.product_title,
      desiredPromotion: parsed.data.desired_promotion,
      shopPromotions: await shopPromotionTitles(ctx.organizationId),
    }, { ctx })

    return jsonResponse({ data: { copy: result.copy, source: result.source } })
  },
})
