/**
 * Danh mục Gói bộ ảnh thương mại & Tùy chọn biến thể cho Công cụ 02.
 */

export interface SetVariantDefinition {
  readonly id: string
  readonly name: string
  readonly aspectRatio: "1:1" | "4:5" | "9:16" | "16:9"
  readonly angle: "front" | "angle_15" | "angle_30" | "top_down" | "close_up"
  readonly angleLabel: string
  readonly channelTarget: "Catalog" | "Bài đăng MXH" | "Story / Reels" | "Chi tiết SP"
  readonly promptDirective: string
}

export interface ImageSetBundle {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly isDefault?: boolean
  readonly variants: readonly SetVariantDefinition[]
}

export const IMAGE_SET_BUNDLES: readonly ImageSetBundle[] = [
  {
    id: "omnichannel_default",
    name: "Bộ Đăng Bán Đa Kênh ✨",
    description: "Bộ chuẩn sẵn sàng cho mọi kênh: Catalog sàn, Bài đăng MXH, Story/Reels và Ảnh chi tiết",
    isDefault: true,
    variants: [
      {
        id: "var_catalog",
        name: "Ảnh Catalog chuẩn sàn",
        aspectRatio: "1:1",
        angle: "front",
        angleLabel: "Chính diện",
        channelTarget: "Catalog",
        promptDirective: "front-facing eye-level commercial catalog shot, 1:1 square ratio, clean seamless studio backdrop",
      },
      {
        id: "var_social",
        name: "Ảnh Bài đăng Facebook / Instagram",
        aspectRatio: "4:5",
        angle: "angle_15",
        angleLabel: "Góc nghiêng 15°",
        channelTarget: "Bài đăng MXH",
        promptDirective: "dynamic 15-degree angled perspective product photo, 4:5 vertical ratio, soft natural studio floor shadow",
      },
      {
        id: "var_story",
        name: "Ảnh Story / Reels / TikTok",
        aspectRatio: "9:16",
        angle: "front",
        angleLabel: "Khổ dọc toàn màn hình",
        channelTarget: "Story / Reels",
        promptDirective: "9:16 full-screen mobile vertical commercial product shot with balanced studio softbox ambient light",
      },
      {
        id: "var_closeup",
        name: "Ảnh Cận cảnh chi tiết",
        aspectRatio: "1:1",
        angle: "close_up",
        angleLabel: "Cận cảnh",
        channelTarget: "Chi tiết SP",
        promptDirective: "ultra-sharp macro close-up product photograph highlighting fine textures and materials",
      },
    ],
  },
  {
    id: "catalog_angles",
    name: "Bộ Đa Góc Catalog",
    description: "Tập trung thể hiện đầy đủ các góc nhìn sản phẩm cho khách mua hàng trực tuyến",
    variants: [
      {
        id: "angle_front",
        name: "Chính diện",
        aspectRatio: "1:1",
        angle: "front",
        angleLabel: "Chính diện",
        channelTarget: "Catalog",
        promptDirective: "direct front eye-level commercial studio product photo, 1:1 ratio",
      },
      {
        id: "angle_left",
        name: "Góc nghiêng trái",
        aspectRatio: "1:1",
        angle: "angle_15",
        angleLabel: "Nghiêng trái 15°",
        channelTarget: "Catalog",
        promptDirective: "gentle 15-degree left angled commercial studio product photo, 1:1 ratio",
      },
      {
        id: "angle_right",
        name: "Góc nghiêng phải",
        aspectRatio: "1:1",
        angle: "angle_30",
        angleLabel: "Nghiêng phải 30°",
        channelTarget: "Catalog",
        promptDirective: "gentle 30-degree right perspective commercial studio product photo, 1:1 ratio",
      },
      {
        id: "angle_top",
        name: "Góc nhìn từ trên xuống",
        aspectRatio: "1:1",
        angle: "top_down",
        angleLabel: "Từ trên xuống",
        channelTarget: "Catalog",
        promptDirective: "top-down flat-lay perspective commercial studio product photo, 1:1 ratio",
      },
    ],
  },
] as const
