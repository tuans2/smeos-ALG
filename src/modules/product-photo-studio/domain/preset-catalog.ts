/**
 * Danh mục Preset phông nền & tỉ lệ ảnh cho Công cụ 01 — Tạo ảnh sản phẩm chuyên nghiệp.
 * Hỗ trợ chế độ mặc định tự động (AUTO) để người dùng không cần chọn thủ công.
 */

export interface BackgroundPreset {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly promptDirective: string
  readonly colorHex?: string
}

export interface AspectRatioOption {
  readonly id: string
  readonly label: string
  readonly ratio: string
  readonly description: string
}

export const BACKGROUND_PRESETS: readonly BackgroundPreset[] = [
  {
    id: "auto",
    name: "Tự động tối ưu ✨",
    description: "AI tự động phân tích và chọn phông nền phù hợp nhất với sản phẩm",
    promptDirective: "seamless, elegant studio backdrop tailored to contrast harmoniously with the product",
  },
  {
    id: "soft_cream",
    name: "Kem nhạt tinh tế",
    description: "Phông nền tông kem ấm áp, ánh sáng studio dịu mắt",
    promptDirective: "seamless soft warm-cream studio backdrop with subtle natural floor contact shadows",
    colorHex: "#fcf8f2",
  },
  {
    id: "clean_white",
    name: "Trắng sạch chuẩn sàn",
    description: "Nền trắng tinh khiết chuẩn catalog thương mại điện tử",
    promptDirective: "seamless clean bright white e-commerce catalog studio backdrop with gentle softbox shadow",
    colorHex: "#ffffff",
  },
  {
    id: "warm_gray",
    name: "Xám ấm thanh lịch",
    description: "Phông nền xám trung tính, hiện đại và sang trọng",
    promptDirective: "seamless neutral warm-gray modern studio backdrop with professional softbox illumination",
    colorHex: "#f3f4f6",
  },
  {
    id: "brand_custom",
    name: "Màu thương hiệu tiệm",
    description: "Sử dụng gam màu chủ đạo của hồ sơ cửa hàng",
    promptDirective: "clean studio background reflecting the brand accent colors with balanced exposure",
  },
] as const

export const ASPECT_RATIO_OPTIONS: readonly AspectRatioOption[] = [
  {
    id: "auto",
    label: "Tự động ✨",
    ratio: "original",
    description: "Giữ tỷ lệ ảnh gốc hoặc tự tối ưu theo dạng sản phẩm",
  },
  {
    id: "1_1",
    label: "Vuông (1:1)",
    ratio: "1:1",
    description: "Chuẩn bài đăng Instagram, Facebook feeds, Shopee",
  },
  {
    id: "4_5",
    label: "Dọc vừa (4:5)",
    ratio: "4:5",
    description: "Tối ưu hiển thị bảng tin di động Facebook/Instagram",
  },
  {
    id: "9_16",
    label: "Story / Reels (9:16)",
    ratio: "9:16",
    description: "Khổ dọc toàn màn hình TikTok, Reels, Stories",
  },
] as const
