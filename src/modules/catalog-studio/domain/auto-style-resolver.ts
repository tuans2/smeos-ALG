/**
 * Universal Catalog Studio 2026 — Auto Style Resolver
 * Pure Domain — Zero ORM, Zero Infrastructure.
 *
 * Phân tích userDirectives để gợi ý template + style phù hợp nhất
 * cho luồng Tự động (Autonomous), trước khi AI bắt đầu xử lý thật.
 */

import type { CatalogTemplateId, CatalogStyleId } from "./entities/catalog-studio.types"

export interface StyleSuggestion {
  templateId: CatalogTemplateId
  styleId: CatalogStyleId
  templateName: string
  styleName: string
  reason: string
  confidence: "HIGH" | "MEDIUM" | "LOW"
  emoji: string
}

interface KeywordRule {
  keywords: string[]
  templateId: CatalogTemplateId
  styleId: CatalogStyleId
  reason: string
  emoji: string
}

const KEYWORD_RULES: KeywordRule[] = [
  // Cao cấp / VIP / Sang trọng
  {
    keywords: ["cao cấp", "vip", "sang trọng", "luxury", "premium", "độc bản", "trang sức", "đồng hồ", "rượu", "wine"],
    templateId: "T05_DARK_CINEMATIC",
    styleId: "S11_DARK_SHOWCASE",
    reason: "Phong cách điện ảnh studio tối phù hợp sản phẩm cao cấp, tôn vinh từng chi tiết",
    emoji: "🎬",
  },
  // Cưới / Kỷ niệm / Quà tặng sang
  {
    keywords: ["cưới", "wedding", "kỷ niệm", "anniversary", "lookbook", "quà tặng vip", "gift set"],
    templateId: "T03_PREMIUM_LOOKBOOK",
    styleId: "S03_QUIET_LUXURY",
    reason: "Lookbook tông ấm sang trọng thầm lặng, tôn vinh cảm xúc và giá trị độc bản",
    emoji: "💍",
  },
  // Tạp chí / Thời trang / Hoa tươi nghệ thuật
  {
    keywords: ["thời trang", "fashion", "hoa nghệ thuật", "tạp chí", "editorial", "bộ sưu tập mùa", "collection"],
    templateId: "T01_SIGNATURE_COLLECTION",
    styleId: "S01_EDITORIAL_MAGAZINE",
    reason: "Tạp chí biên tập với ảnh lớn 4:5, tôn vinh phẩm cấp thương hiệu",
    emoji: "📸",
  },
  // Gen Z / Trẻ trung / F&B / Bán lẻ đa dạng
  {
    keywords: ["bento", "gen z", "trẻ", "năng động", "sinh động", "f&b", "fnb", "đồ ăn", "đồ uống", "bán lẻ", "đa dạng", "nhiều sản phẩm", "hot trend", "trending"],
    templateId: "T04_BENTO_SHOWCASE",
    styleId: "S08_BENTO_GALLERY",
    reason: "Bố cục chia khối hiện đại, dễ lướt xem trên điện thoại",
    emoji: "⚡",
  },
  // Tối giản / B2B / Báo giá / Kỹ thuật
  {
    keywords: ["tối giản", "minimal", "b2b", "báo giá", "price list", "kỹ thuật", "thông số", "đơn giản", "gọn", "nhiều mẫu"],
    templateId: "T02_MINIMAL_PRODUCT_LIST",
    styleId: "S02_PURE_MINIMAL",
    reason: "Danh mục tối giản Bắc Âu, hiển thị nhiều mẫu hàng rõ ràng, dễ đặt hàng",
    emoji: "🗂️",
  },
  // Hoa tươi / Thiên nhiên / Organic
  {
    keywords: ["hoa", "flower", "cây", "thiên nhiên", "organic", "tự nhiên", "thực vật", "botanical", "mộc mạc"],
    templateId: "T01_SIGNATURE_COLLECTION",
    styleId: "S06_BOTANICAL_ATELIER",
    reason: "Botanical Atelier — khung cành lá tinh xảo, thơ mộng, lãng mạn như nhật ký nghệ nhân",
    emoji: "🌸",
  },
  // Sự kiện / Lễ hội / Sinh nhật
  {
    keywords: ["20/10", "8/3", "valentine", "sinh nhật", "birthday", "lễ hội", "tết", "giáng sinh", "noel", "khai trương"],
    templateId: "T01_SIGNATURE_COLLECTION",
    styleId: "S04_BOLD_POP",
    reason: "Bold Pop — tươi sáng, năng lượng cao, thu hút thị giác ngay lập tức cho dịp đặc biệt",
    emoji: "🎉",
  },
]

/** Template mặc định khi không match keyword nào */
const DEFAULT_SUGGESTION: StyleSuggestion = {
  templateId: "T01_SIGNATURE_COLLECTION",
  styleId: "S01_EDITORIAL_MAGAZINE",
  templateName: "Bộ sưu tập đặc trưng",
  styleName: "Tạp chí thời trang",
  reason: "Template phổ biến nhất, phù hợp đa dạng loại sản phẩm và ngành hàng",
  confidence: "MEDIUM",
  emoji: "✨",
}

export const TEMPLATE_NAMES: Record<CatalogTemplateId, string> = {
  T01_SIGNATURE_COLLECTION: "Bộ sưu tập đặc trưng",
  T02_MINIMAL_PRODUCT_LIST: "Danh sách tối giản",
  T03_PREMIUM_LOOKBOOK: "Lookbook cao cấp",
  T04_BENTO_SHOWCASE: "Lưới khối nổi bật",
  T05_DARK_CINEMATIC: "Nền tối điện ảnh",
}

export const STYLE_NAMES: Record<CatalogStyleId, string> = {
  S01_EDITORIAL_MAGAZINE: "Tạp chí thời trang",
  S02_PURE_MINIMAL: "Tối giản",
  S03_QUIET_LUXURY: "Sang trọng nhẹ nhàng",
  S04_BOLD_POP: "Màu nổi bật",
  S05_ORGANIC_NATURAL: "Tự nhiên mộc mạc",
  S06_BOTANICAL_ATELIER: "Xưởng thực vật",
  S07_SWISS_GRID: "Lưới chuẩn mực",
  S08_BENTO_GALLERY: "Thư viện khối",
  S09_MODERN_RETRO: "Cổ điển hiện đại",
  S10_PLAYFUL_ILLUSTRATION: "Minh họa vui tươi",
  S11_DARK_SHOWCASE: "Trưng bày nền tối",
  S12_MODERN_COMMERCE: "Thương mại hiện đại",
}

/** Tên hiển thị tiếng Việt của mẫu catalog (không hiện mã T0x trên màn). */
export const templateDisplayName = (id: string): string => TEMPLATE_NAMES[id as CatalogTemplateId] ?? "Mẫu catalog"

/**
 * Phân tích userDirectives và trả về tối đa 3 gợi ý style/template.
 * Nếu có preferredChoice (người dùng chọn ở form), đưa lên vị trí ưu tiên đầu tiên.
 */
export function resolveAutoStyleSuggestions(
  userDirectives: string,
  preferredChoice?: { templateId: CatalogTemplateId; styleId: CatalogStyleId } | null,
  maxSuggestions = 3
): StyleSuggestion[] {
  const lower = userDirectives.toLowerCase()

  const scored: Array<{ rule: KeywordRule; score: number }> = []

  for (const rule of KEYWORD_RULES) {
    let score = 0
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        score += kw.length // Longer keywords score higher (more specific)
      }
    }
    if (score > 0) scored.push({ rule, score })
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  // Deduplicate by templateId (keep highest score per template)
  const seen = new Set<CatalogTemplateId>()
  const deduped = scored.filter(({ rule }) => {
    if (seen.has(rule.templateId)) return false
    seen.add(rule.templateId)
    return true
  })

  const topMatches = deduped.slice(0, maxSuggestions - 1)

  const suggestions: StyleSuggestion[] = topMatches.map(({ rule, score }, idx) => ({
    templateId: rule.templateId,
    styleId: rule.styleId,
    templateName: TEMPLATE_NAMES[rule.templateId],
    styleName: STYLE_NAMES[rule.styleId],
    reason: rule.reason,
    confidence: idx === 0 && score >= 5 ? "HIGH" : "MEDIUM",
    emoji: rule.emoji,
  }))

  // Always add a fallback if we have room and no result matched yet
  if (suggestions.length === 0) {
    suggestions.push(DEFAULT_SUGGESTION)
  }

  // Thêm T04 làm lựa chọn thứ hai nếu chưa có
  const hasT04 = suggestions.some((s) => s.templateId === "T04_BENTO_SHOWCASE")
  if (!hasT04 && suggestions.length < maxSuggestions) {
    suggestions.push({
      templateId: "T04_BENTO_SHOWCASE",
      styleId: "S08_BENTO_GALLERY",
      templateName: "Lưới khối nổi bật",
      styleName: "Thư viện khối",
      reason: "Bố cục chia khối năng động, hợp với khách hàng trẻ",
      confidence: "LOW",
      emoji: "⚡",
    })
  }

  if (preferredChoice) {
    const preferredSug: StyleSuggestion = {
      templateId: preferredChoice.templateId,
      styleId: preferredChoice.styleId,
      templateName: TEMPLATE_NAMES[preferredChoice.templateId],
      styleName: STYLE_NAMES[preferredChoice.styleId],
      reason: "Phong cách bạn đã chọn trực tiếp ở bước nhập liệu",
      confidence: "HIGH",
      emoji: "🎯",
    }
    const rest = suggestions.filter((s) => s.styleId !== preferredChoice.styleId)
    return [preferredSug, ...rest].slice(0, maxSuggestions)
  }

  return suggestions.slice(0, maxSuggestions)
}
