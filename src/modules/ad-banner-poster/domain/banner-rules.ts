/**
 * banner-rules.ts — Luật nghiệp vụ thuần kiểm định chất lượng (QC Rules) cho Công cụ 05.
 * Đảm bảo 100% testable không phụ thuộc DB hay network.
 */

import { OUTPUT_STANDARDS_05 } from "./output-standard"
import type { BannerProjectInput } from "./banner-types"

export interface BannerQcEvaluationItem {
  readonly code: string
  readonly name: string
  readonly passed: boolean
  readonly score: number
  readonly message?: string | undefined
}

export interface BannerQcEvaluation {
  readonly isPassed: boolean
  readonly overallScore: number
  readonly criteria: readonly BannerQcEvaluationItem[]
  readonly failedCriteria: readonly string[]
  readonly retryHint?: string | undefined
}

export function evaluateBannerQc(input: BannerProjectInput): BannerQcEvaluation {
  const criteria: BannerQcEvaluationItem[] = []

  // 1. product_fidelity (MANDATORY)
  const hasProductImage = Boolean(input.productImageUrl && input.productImageUrl.trim().length > 0)
  criteria.push({
    code: "product_fidelity",
    name: "Giữ nguyên sản phẩm thật",
    passed: hasProductImage,
    score: hasProductImage ? 1.0 : 0.0,
    message: !hasProductImage ? "Chưa có ảnh sản phẩm thật cho ấn phẩm quảng cáo" : undefined,
  })

  // 2. text_clarity (MANDATORY)
  const hasHeadline = Boolean(input.copy.headline && input.copy.headline.trim().length >= 3)
  const hasSubHeadline = Boolean(input.copy.subHeadline && input.copy.subHeadline.trim().length >= 5)
  const textPassed = hasHeadline && hasSubHeadline
  criteria.push({
    code: "text_clarity",
    name: "Chữ tiếng Việt rõ nét & không lỗi font",
    passed: textPassed,
    score: (hasHeadline ? 0.6 : 0) + (hasSubHeadline ? 0.4 : 0),
    message: !textPassed ? "Cần có tiêu đề chính và thông điệp phụ rõ ràng" : undefined,
  })

  // 3. brand_identity (MANDATORY)
  const hasShopName = Boolean(input.brandInfo.shopName && input.brandInfo.shopName.trim().length > 0)
  const hasContact = Boolean(
    (input.brandInfo.hotline && input.brandInfo.hotline.trim().length > 0) ||
    (input.brandInfo.address && input.brandInfo.address.trim().length > 0)
  )
  const brandPassed = hasShopName && hasContact
  criteria.push({
    code: "brand_identity",
    name: "Thông tin nhận diện cửa hàng",
    passed: brandPassed,
    score: (hasShopName ? 0.6 : 0) + (hasContact ? 0.4 : 0),
    message: !brandPassed ? "Thiếu tên cửa hàng hoặc thông tin liên hệ (hotline/địa chỉ)" : undefined,
  })

  // 4. cta_presence (MANDATORY)
  const hasCta = Boolean(input.copy.ctaText && input.copy.ctaText.trim().length >= 2)
  criteria.push({
    code: "cta_presence",
    name: "Lời kêu gọi hành động (CTA)",
    passed: hasCta,
    score: hasCta ? 1.0 : 0.0,
    message: !hasCta ? "Thiếu nút hoặc lời kêu gọi hành động (CTA)" : undefined,
  })

  // 5. layout_balance (SCORED)
  const hasValidFormats = input.targetFormats && input.targetFormats.length > 0
  criteria.push({
    code: "layout_balance",
    name: "Bố cục cân đối tỉ lệ vàng",
    passed: hasValidFormats,
    score: hasValidFormats ? 0.95 : 0.4,
    message: !hasValidFormats ? "Chưa chọn kích thước xuất bản nào" : undefined,
  })

  // 6. promo_prominence (SCORED)
  const hasPromo = Boolean(input.copy.promotionBadge && input.copy.promotionBadge.trim().length > 0)
  criteria.push({
    code: "promo_prominence",
    name: "Điểm nhấn ưu đãi bắt mắt",
    passed: hasPromo,
    score: hasPromo ? 1.0 : 0.5,
    message: !hasPromo ? "Nên thêm nhãn ưu đãi để tăng tỉ lệ nhấp/mua" : undefined,
  })

  // Tổng hợp
  const mandatoryCodes = new Set(
    OUTPUT_STANDARDS_05.filter((s) => s.type === "MANDATORY").map((s) => s.code)
  )

  const failedCriteria = criteria
    .filter((c) => (mandatoryCodes.has(c.code) && !c.passed) || c.score < 0.7)
    .map((c) => c.code)

  const isPassed = criteria
    .filter((c) => mandatoryCodes.has(c.code))
    .every((c) => c.passed)

  const overallScore = Number(
    (criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length).toFixed(2)
  )

  const retryHint = failedCriteria.length > 0
    ? `Cần bổ sung: ${criteria.filter((c) => failedCriteria.includes(c.code)).map((c) => c.message).filter(Boolean).join("; ")}`
    : undefined

  return {
    isPassed,
    overallScore,
    criteria,
    failedCriteria,
    retryHint,
  }
}
