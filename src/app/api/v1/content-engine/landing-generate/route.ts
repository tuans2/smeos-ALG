
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { landingGenerateBody } from "@/app/api/v1/_contracts/requests-content"
import { getBusinessProfile } from "@/modules/profiles/use-cases/get-business-profile"
import { getBrandProfile } from "@/modules/profiles/use-cases/get-brand-profile"
import { executeGenerateLandingContent } from "@/modules/content-engine/use-cases/generate-landing-page-content.use-case"
import { listActiveShopPromotions, shopDiscountPercent } from "@/modules/greeting-card/use-cases/active-shop-promotions"
import { LANDING_TYPE_OPTIONS } from "@/modules/landing-page/domain/preset-catalog"
import { saveLandingPage } from "@/modules/landing-page/use-cases/save-landing-page"
import { getApprovedSellingNotes } from "@/modules/product-copies/use-cases/get-approved-selling-notes"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  // J7 — sinh nội dung AI cho landing/catalog (PO 30/10/2026, trả nợ #170)
  auth: { kind: "tenant", capability: "J7" },
  handler: async ({ request, ctx }) => {
    const body = await request.json().catch(() => null)
    const parsed = landingGenerateBody.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }

    // Lấy Nguồn 1: Cốt lõi Business Profile & Brand Profile của tiệm
    const productIds = parsed.data.selectedProducts.flatMap((p) => (p.id ? [p.id] : []))
    const [bizProfile, brandProfile, promotions, sellingNotes] = await Promise.all([
      getBusinessProfile(ctx).catch(() => null),
      getBrandProfile(ctx).catch(() => null),
      listActiveShopPromotions(ctx.organizationId).catch(() => []),
      // Thiếu quyền đọc dữ liệu bán hàng hoặc lỗi đọc → viết như cũ, không chặn
      getApprovedSellingNotes(ctx, productIds).catch(() => new Map<string, string>()),
    ])

    // Mục đích trang (bộ chọn loại trang trên /landing-page) → một dòng chỉ dẫn cho Writer AI.
    const pageOption = LANDING_TYPE_OPTIONS.find((o) => o.type === parsed.data.pageType)
    const shopName = bizProfile?.display_name || "Tiệm Sản Phẩm"
    const shopTone = brandProfile?.tone_of_voice || undefined

    const result = await executeGenerateLandingContent(
      {
        shopName,
        shopTone,
        occasionId: parsed.data.occasionId,
        occasionLabel: parsed.data.occasionLabel,
        archetypeId: parsed.data.archetypeId,
        selectedProducts: parsed.data.selectedProducts.map(({ id, ...p }) => ({
          ...p,
          sellingNote: id ? sellingNotes.get(id) : undefined,
        })),
        userDirectives: parsed.data.userDirectives,
        // Ưu đãi chỉ lấy từ Hồ sơ tiệm (đang bật) — không nhận % từ trình duyệt, không mặc định
        discountPercent: shopDiscountPercent(promotions),
        usps: parsed.data.usps,
        guarantees: parsed.data.guarantees,
        targetAudience: parsed.data.targetAudience,
        designDirection: parsed.data.designDirection,
        pageGoal: pageOption ? `${pageOption.title} — ${pageOption.subTitle}` : undefined,
      },
      ctx
    )

    // Kho dữ liệu v2 (L-1): lưu để tìm lại; lỗi lưu không chặn kết quả sinh.
    const landingPageId = await saveLandingPage(ctx, {
      title: result.hero?.headline || parsed.data.occasionLabel,
      pageType: parsed.data.pageType ?? null,
      occasionLabel: parsed.data.occasionLabel,
      input: parsed.data,
      content: result,
    })

    return jsonResponse({
      data: { ...result, landing_page_id: landingPageId },
    })
  },
})
