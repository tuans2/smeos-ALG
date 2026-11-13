/**
 * Danh mục Preset và Mẫu thiết kế cho Công cụ 08 — Tạo Landing Page.
 * Hỗ trợ đa ngành theo chuẩn IndustryPluginContract và SSOT ALG v3.
 */

export type LandingPageType = "STORE_BRAND" | "CHAIN_BRAND" | "CAMPAIGN_SEASONAL" | "SHOWCASE_HIGHLIGHT"

export interface LandingArchetype {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly colorTone: string
  readonly recommendedIndustries: readonly string[]
  readonly previewBadge: string
}

export const LANDING_ARCHETYPES: readonly LandingArchetype[] = [
  {
    id: "minimal-luxury",
    name: "Tối giản sang trọng (Minimal Luxury)",
    description: "Tông màu trang nhã, phông chữ tinh tế, tôn vinh hình ảnh sản phẩm cao cấp",
    colorTone: "neutral",
    recommendedIndustries: ["FLORIST", "FASHION", "JEWELRY", "GIFT_CRAFT"],
    previewBadge: "💎 Sang trọng",
  },
  {
    id: "vibrant-energy",
    name: "Sôi động cuốn hút (Vibrant Energy)",
    description: "Màu sắc nổi bật, kích thích hành động mua hàng, phù hợp sự kiện hoặc khuyến mãi lớn",
    colorTone: "warm",
    recommendedIndustries: ["FNB", "RETAIL", "EVENTS"],
    previewBadge: "🔥 Bùng nổ",
  },
  {
    id: "warm-artisan",
    name: "Ấm cúng thủ công (Warm Artisan)",
    description: "Cảm giác mộc mạc, gần gũi, tôn vinh tay nghề nghệ nhân và quy trình sáng tạo",
    colorTone: "earth",
    recommendedIndustries: ["GIFT_CRAFT", "BAKERY", "PET_CARE", "FLORIST"],
    previewBadge: "🌿 Nghệ nhân",
  },
  {
    id: "modern-tech",
    name: "Hiện đại chuyên nghiệp (Modern Pro)",
    description: "Bố cục rõ ràng, mạnh mẽ, phù hợp với các đơn vị dịch vụ và chuỗi quy mô",
    colorTone: "cool",
    recommendedIndustries: ["SERVICES", "TECH", "CHAIN_RETAIL"],
    previewBadge: "🚀 Chuyên nghiệp",
  },
] as const

export interface LandingTypeOption {
  readonly type: LandingPageType
  readonly title: string
  readonly subTitle: string
  readonly iconName: string
  readonly defaultSections: readonly string[]
}

export const LANDING_TYPE_OPTIONS: readonly LandingTypeOption[] = [
  {
    type: "STORE_BRAND",
    title: "Trang giới thiệu cửa hàng chính thức",
    subTitle: "Xây dựng địa chỉ web uy tín với câu chuyện tiệm, sản phẩm tiêu biểu và thông tin liên hệ một chạm",
    iconName: "Store",
    defaultSections: ["hero", "story", "products", "perks", "gallery", "reviews", "lead"],
  },
  {
    type: "CHAIN_BRAND",
    title: "Trang thương hiệu chuỗi hệ thống",
    subTitle: "Giới thiệu toàn mạng lưới cửa hàng thành viên, năng lực cung ứng và điều phối liên hệ theo khu vực",
    iconName: "Building2",
    defaultSections: ["hero", "story", "products", "perks", "process", "lead"],
  },
  {
    type: "CAMPAIGN_SEASONAL",
    title: "Trang chiến dịch & dịp lễ đặc biệt",
    subTitle: "Tập trung vào bộ sưu tập giới hạn theo mùa, đếm ngược ưu đãi và kích hoạt mua sắm nhanh",
    iconName: "Sparkles",
    defaultSections: ["hero", "products", "perks", "reviews", "faq", "lead"],
  },
  {
    type: "SHOWCASE_HIGHLIGHT",
    title: "Trang chào dịch vụ & công trình tiêu biểu",
    subTitle: "Dành cho khách sự kiện và doanh nghiệp với hình ảnh dự án thực tế, quy trình và nút báo giá",
    iconName: "Briefcase",
    defaultSections: ["hero", "story", "gallery", "process", "faq", "lead"],
  },
] as const
