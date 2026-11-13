/**
 * Smart Budget Flower Matcher & Similarity Upsell Engine (SP-18, SP-19, BH-04).
 * Pure TypeScript Domain - Không phụ thuộc Prisma hay UI.
 * Thuật toán tìm kiếm thông minh theo ngân sách, tính điểm tương thích và đề xuất Upsell.
 */

export interface BudgetMatchCriteria {
  minPriceVnd: number
  maxPriceVnd: number
  occasion?: string | undefined // Sinh nhật, Khai trương, Tình yêu, Kỷ niệm, Chia buồn...
  colorTone?: string | undefined // Pastel, Đỏ, Vàng, Trắng, Cam, Tím...
  recipient?: string | undefined // Bạn gái, Mẹ, Sếp, Đối tác, Bạn bè...
  arrangementStyle?: string | undefined // Sản phẩm, Giỏ hoa, Hộp hoa, Kệ hoa...
}

export interface ProductMatchCandidate {
  id: string
  code: string
  name: string
  sellingPriceVnd: number
  category: string
  colorTheme: string
  occasions: string[]
  style: string
  imageUrl?: string | undefined
  highlightFlowers: string[]
  isFeatured?: boolean | undefined
}

export interface MatchScoredProduct {
  product: ProductMatchCandidate
  matchScore: number // 0 - 100
  isExactBudget: boolean
  isUpsellRecommendation: boolean
  matchReasons: string[]
  suggestedCustomerPitch: string
}

export interface BudgetMatchResult {
  bestMatches: MatchScoredProduct[]
  upsellMatches: MatchScoredProduct[]
  totalCandidatesEvaluated: number
  consultingSummary: string
}

/**
 * Tính điểm tương thích giữa sản phẩm và tiêu chí khách hàng (0 - 100)
 */
export function calculateProductMatchScore(
  product: ProductMatchCandidate,
  criteria: BudgetMatchCriteria,
): { score: number; reasons: string[]; isExactBudget: boolean; isUpsell: boolean } {
  let score = 0
  const reasons: string[] = []

  const price = product.sellingPriceVnd
  const min = Math.max(0, criteria.minPriceVnd)
  const max = Math.max(min, criteria.maxPriceVnd)

  const isExactBudget = price >= min && price <= max
  // Upsell: giá cao hơn ngân sách tối đa từ 1% đến 25%
  const isUpsell = !isExactBudget && price > max && price <= max * 1.25

  // 1. Điểm ngân sách (tối đa 40 điểm)
  if (isExactBudget) {
    score += 40
    reasons.push("Đúng tầm ngân sách yêu cầu")
  } else if (isUpsell) {
    const diffPercent = Math.round(((price - max) / max) * 100)
    score += 25
    reasons.push(`Nâng cấp nhẹ (+${diffPercent}% so với ngân sách, dáng hoa vượt trội)`)
  } else if (price < min && price >= min * 0.8) {
    score += 20
    reasons.push("Mức giá tiết kiệm hơn dự tính")
  }

  // 2. Điểm dịp tặng (tối đa 25 điểm)
  if (criteria.occasion) {
    const normOccasion = normalizeText(criteria.occasion)
    const matchOccasion = product.occasions.some((o) => normalizeText(o).includes(normOccasion) || normOccasion.includes(normalizeText(o)))
    if (matchOccasion) {
      score += 25
      reasons.push(`Phù hợp cho dịp ${criteria.occasion}`)
    }
  } else {
    score += 15 // Thưởng mặc định nếu khách không chỉ định
  }

  // 3. Điểm màu sắc (tối đa 20 điểm)
  if (criteria.colorTone) {
    const normColor = normalizeText(criteria.colorTone)
    if (normalizeText(product.colorTheme).includes(normColor)) {
      score += 20
      reasons.push(`Tông màu ${product.colorTheme} chuẩn gu`)
    }
  } else {
    score += 10
  }

  // 4. Điểm kiểu dáng chế tác (tối đa 15 điểm)
  if (criteria.arrangementStyle) {
    const normStyle = normalizeText(criteria.arrangementStyle)
    if (normalizeText(product.style).includes(normStyle) || normalizeText(product.category).includes(normStyle)) {
      score += 15
      reasons.push(`Dáng cắm ${product.style}`)
    }
  } else {
    score += 10
  }

  // Thưởng hoa nổi bật hoặc sản phẩm Best Seller
  if (product.isFeatured) {
    score = Math.min(100, score + 5)
    reasons.push("Mẫu được yêu thích nhất tiệm")
  }

  return {
    score: Math.min(100, score),
    reasons,
    isExactBudget,
    isUpsell,
  }
}

/**
 * Sinh câu tư vấn chốt sale 1-chạm gửi trực tiếp cho khách qua Zalo/Chat
 */
export function generateCustomerPitch(
  product: ProductMatchCandidate,
  criteria: BudgetMatchCriteria,
  isUpsell: boolean,
): string {
  const occasion = criteria.occasion ? ` dịp ${criteria.occasion}` : ""
  const recipient = criteria.recipient ? ` tặng ${criteria.recipient}` : ""
  const flowers = product.highlightFlowers.length > 0 ? product.highlightFlowers.slice(0, 3).join(", ") : "hoa tuyển chọn"
  // Chỉ nói tông màu khi sản phẩm thật có dữ liệu (không để "tone " trống — OPERATING_PRINCIPLES §2)
  const tone = product.colorTheme.trim() ? ` tone ${product.colorTheme}` : ""

  if (isUpsell) {
    return `Dạ bên em có thêm mẫu "${product.name}" giá ${product.sellingPriceVnd.toLocaleString("vi-VN")} đ. Mẫu này phối ${flowers}${tone} dáng hoành tráng và sang trọng hơn nhiều, rất xứng đáng để${recipient}${occasion} ạ!`
  }

  return `Dạ bên em có mẫu "${product.name}" rất hợp với ngân sách của mình, giá ${product.sellingPriceVnd.toLocaleString("vi-VN")} đ. Mẫu thiết kế${tone} với ${flowers}, rất tinh tế để${recipient}${occasion} ạ!`
}

/**
 * Bộ lọc thông minh đối sánh và đề xuất sản phẩm theo ngân sách (SP-18, SP-19, BH-04)
 */
export function matchProductsByBudget(
  candidates: ProductMatchCandidate[],
  criteria: BudgetMatchCriteria,
): BudgetMatchResult {
  const scoredItems: MatchScoredProduct[] = candidates.map((candidate) => {
    const evaluation = calculateProductMatchScore(candidate, criteria)
    const pitch = generateCustomerPitch(candidate, criteria, evaluation.isUpsell)

    return {
      product: candidate,
      matchScore: evaluation.score,
      isExactBudget: evaluation.isExactBudget,
      isUpsellRecommendation: evaluation.isUpsell,
      matchReasons: evaluation.reasons,
      suggestedCustomerPitch: pitch,
    }
  })

  // Sắp xếp theo điểm tương thích giảm dần
  const exactCandidates = scoredItems
    .filter((item) => item.isExactBudget)
    .sort((a, b) => b.matchScore - a.matchScore)

  const upsellCandidates = scoredItems
    .filter((item) => item.isUpsellRecommendation)
    .sort((a, b) => b.matchScore - a.matchScore)

  const bestMatches = exactCandidates.slice(0, 4)
  const upsellMatches = upsellCandidates.slice(0, 2)

  const summary = `Đã tìm thấy ${bestMatches.length} mẫu chuẩn ngân sách (${criteria.minPriceVnd.toLocaleString("vi-VN")} - ${criteria.maxPriceVnd.toLocaleString("vi-VN")} đ)` +
    (upsellMatches.length > 0 ? ` và ${upsellMatches.length} mẫu gợi ý nâng cấp cao cấp.` : ".")

  return {
    bestMatches,
    upsellMatches,
    totalCandidatesEvaluated: candidates.length,
    consultingSummary: summary,
  }
}

function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}
