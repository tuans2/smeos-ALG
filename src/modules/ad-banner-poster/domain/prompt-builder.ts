/**
 * prompt-builder.ts — Prompt Builder cho Công cụ 05: Tạo poster và banner quảng cáo.
 * Chuẩn Single-Call Provider và Prompt Content Engine, trung lập đa ngành.
 */

import type { BannerProjectInput } from "./banner-types"

export function buildBannerSingleCallPrompt(project: BannerProjectInput): string {
  const { occasionLabel, industryKey, copy, brandInfo, stylePresetId } = project

  return JSON.stringify(
    {
      task: "commercial_ad_poster_banner_generation",
      standard_ref: "output_standard_05_v1",
      industry_key: industryKey,
      occasion: occasionLabel,
      style_preset: stylePresetId,
      copywriting: {
        headline: copy.headline,
        sub_headline: copy.subHeadline,
        promotion_badge: copy.promotionBadge,
        cta_text: copy.ctaText,
        validity: copy.validityText,
      },
      brand: {
        shop_name: brandInfo.shopName,
        hotline: brandInfo.hotline,
        address: brandInfo.address,
      },
      rules: {
        preserve_product_fidelity: true,
        accurate_vietnamese_typography: true,
        high_contrast_cta: true,
        no_distorted_text: true,
      },
      aspect_ratios: project.targetFormats,
    },
    null,
    2
  )
}

export function buildBannerCopyPrompt(params: {
  industryKey: string
  occasionLabel: string
  shopName: string
  productTitle?: string | undefined
  /** Ưu đãi tiệm đang bật trong Hồ sơ tiệm — AI chỉ được dùng các ưu đãi này */
  shopPromotions?: readonly string[] | undefined
}): string {
  const { industryKey, occasionLabel, shopName, productTitle } = params
  const promos = params.shopPromotions ?? []

  return `Bạn là Giám đốc Sáng tạo và Chuyên gia Tiếp thị trực tuyến hàng đầu cho doanh nghiệp vừa và nhỏ (SME).
Hãy sáng tạo 1 bộ thông điệp quảng cáo (Banner/Poster Copy) cực kỳ bắt mắt, kích thích khách hàng mua sắm cho dịp "${occasionLabel}".

=== THÔNG TIN ĐẦU VÀO ===
- Tên cửa hàng/thương hiệu: ${shopName}
- Ngành hàng: ${industryKey}
- Dịp sự kiện: ${occasionLabel}
${productTitle ? `- Sản phẩm trọng tâm: ${productTitle}` : ""}
${promos.length > 0 ? `- Ưu đãi của tiệm (chỉ chọn đúng 1 trong các ưu đãi sau, không tự đặt ưu đãi khác): ${promos.join("; ")}` : "- Ưu đãi: Tiệm chưa bật ưu đãi nào — promotionBadge để chuỗi rỗng, không nhắc giảm giá, quà tặng, freeship hay sale ở bất kỳ trường nào"}

=== YÊU CẦU ĐẦU RA (JSON FORMAT) ===
Chỉ trả về duy nhất 1 JSON hợp lệ, không giải thích thêm:
{
  "headline": "Tiêu đề giật tít, ngắn gọn, dưới 10 từ",
  "subHeadline": "Thông điệp phụ truyền cảm hứng, nêu bật giá trị sản phẩm (1-2 câu súc tích)",
  "promotionBadge": "Đúng tên 1 ưu đãi của tiệm ở trên, hoặc chuỗi rỗng",
  "ctaText": "Lời kêu gọi hành động mạnh mẽ (VD: ĐẶT HÀNG NGAY)",
  "validityText": ""
}`
}
