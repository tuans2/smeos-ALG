/**
 * Flower Content Presets & Tone Engine (ND-01 -> ND-10).
 * Pure TypeScript Domain - Không phụ thuộc Prisma hay UI.
 * Sinh nội dung bán hoa đa nền tảng và 5 tone giọng chuyên nghiệp.
 */

export type ContentFormatType =
  | "FB_POST" // ND-01: Bài viết Facebook
  | "INSTA_CAPTION" // ND-02: Bài viết Instagram
  | "WEB_DESCRIPTION" // ND-03, ND-04: Mô tả sản phẩm website
  | "FB_ADS" // ND-05: Nội dung quảng cáo
  | "SALES_PITCH" // ND-06: Bài bán hàng chốt sale
  | "CATCHY_HEADLINE" // ND-07: Tiêu đề giật tít
  | "SHORT_STATUS" // ND-08: Trạng thái ngắn Story/Zalo
  | "LONG_STORY" // ND-09: Kể chuyện dài storytelling
  | "VIDEO_SCRIPT" // ND-10: Kịch bản video 15s-30s

export type ToneOfVoice =
  | "SANG_TRONG" // Quý phái, thanh lịch, tinh tế
  | "AM_AP" // Tình cảm, chân thành, gia đình
  | "TRE_TRUNG" // Bắt trend, tươi vui, hóm hỉnh
  | "TRANG_NGHIEM" // Lịch sự, đối tác, kính cẩn
  | "THUYET_PHUC" // Trực diện, chốt sale, ưu đãi

export interface FlowerContentInput {
  productName: string
  flowerTypes?: string[] | undefined
  colorTheme?: string | undefined
  occasion?: string | undefined
  targetAudience?: string | undefined
  format: ContentFormatType
  tone: ToneOfVoice
  shopBrandName?: string | undefined
  priceVnd?: number | undefined
}

export interface GeneratedContentResult {
  format: ContentFormatType
  tone: ToneOfVoice
  headline: string
  bodyText: string
  callToAction: string
  hashtags: string[]
  fullText: string
  videoScenes?: Array<{ timeRange: string; visualDesc: string; voiceover: string }> | undefined
  characterCount: number
  recommendedPlatform: string
}

export const TONE_LABELS: Record<ToneOfVoice, { label: string; desc: string }> = {
  SANG_TRONG: {
    label: "Sang trọng & Tinh tế",
    desc: "Ngôn từ quý phái, thanh lịch, tôn vinh đẳng cấp người nhận",
  },
  AM_AP: {
    label: "Ấm áp & Chân thành",
    desc: "Gần gũi, giàu cảm xúc, chạm đến trái tim người thân yêu",
  },
  TRE_TRUNG: {
    label: "Trẻ trung & Bắt trend",
    desc: "Tươi vui, hóm hỉnh, phong cách hiện đại hợp Gen Z",
  },
  TRANG_NGHIEM: {
    label: "Trang nghiêm & Lịch sự",
    desc: "Cung kính, chuẩn mực, phù hợp sự kiện lớn và đối tác",
  },
  THUYET_PHUC: {
    label: "Thuyết phục & Chốt sale",
    desc: "Trực diện vào giá trị, kích thích hành động đặt hoa ngay",
  },
}

/**
 * Sinh tiêu đề lôi cuốn theo format và tone giọng
 */
export function generateHeadline(input: FlowerContentInput): string {
  const occasion = input.occasion || "khoảnh khắc đặc biệt"
  const name = input.productName

  switch (input.tone) {
    case "SANG_TRONG":
      return `Vẻ Đẹp Độc Bản — Tuyệt Tác ${name} Cho ${occasion}`
    case "AM_AP":
      return `Gửi Trọn Yêu Thương Cùng ${name} Trong Dịp ${occasion}`
    case "TRE_TRUNG":
      return `✨ Đẹp "Xỉu Ngang" Với ${name} — Đốn Tim Người Ấy Liền Tay!`
    case "TRANG_NGHIEM":
      return `Kính Chúc Trọn Vẹn Ý Nghĩa — Thiết Kế ${name} Trang Trọng`
    case "THUYET_PHUC":
    default:
      return `Ưu Đãi Hôm Nay: Sở Hữu Ngay ${name} Thiết Kế Riêng`
  }
}

/**
 * Sinh nội dung bài bán hoa hoàn chỉnh
 */
export function generateFlowerContent(input: FlowerContentInput): GeneratedContentResult {
  const brand = input.shopBrandName || "ALG Flower Boutique"
  const flowers = input.flowerTypes?.length ? input.flowerTypes.join(", ") : "những đóa hoa tuyển chọn loại 1"
  const color = input.colorTheme ? `tông màu ${input.colorTheme}` : "sắc màu hài hòa, thanh nhã"
  const occasion = input.occasion || "khoảnh khắc trọn vẹn"
  const priceFormatted = input.priceVnd ? `${input.priceVnd.toLocaleString("vi-VN")} đ` : "Ưu đãi giá tốt khi đặt trước"

  const headline = generateHeadline(input)
  let body = ""
  let cta = ""
  let platform = "Facebook"
  const hashtags = [
    `#${slugify(input.productName)}`,
    "#hoatuoi",
    "#shophoatuoi",
    "#hoa_thiet_ke",
    input.occasion ? `#hoa_${slugify(input.occasion)}` : "#tanghoa",
  ]

  if (input.format === "VIDEO_SCRIPT") {
    platform = "TikTok / Reels"
    body = `Kịch bản video 30 giây quảng bá sản phẩm "${input.productName}"`
    cta = "Nhấp vào liên kết trong hồ sơ hoặc nhắn tin ngay để nhận sản phẩm thiết kế riêng!"
    const scenes = [
      {
        timeRange: "0s - 3s (Hook)",
        visualDesc: `Cận cảnh góc quay chi tiết sản phẩm với tông màu ${color}, ánh sáng tự nhiên lấp lánh.`,
        voiceover: `Nếu bạn đang tìm món quà chạm đến trái tim người nhận dịp ${occasion}...`,
      },
      {
        timeRange: "4s - 18s (Chi tiết)",
        visualDesc: `Nghệ nhân tỉ mỉ chăm chút từng chi tiết ${flowers} cùng chất liệu cao cấp.`,
        voiceover: `Mỗi sản phẩm tại ${brand} đều được chắt lọc kỹ lưỡng, giữ trọn chất lượng tinh xảo.`,
      },
      {
        timeRange: "19s - 30s (Thành phẩm & CTA)",
        visualDesc: `Góc máy xoay 360 độ ngắm trọn vẹn ${input.productName}, kèm thiệp chữ viết tay.`,
        voiceover: `Giao hàng hoả tốc tận nơi. Nhắn tin cho chúng mình để trao gửi yêu thương nhé!`,
      },
    ]

    const fullText = `${headline}\n\n${scenes.map((s) => `[${s.timeRange}]\n- Hình ảnh: ${s.visualDesc}\n- Lời thoại: ${s.voiceover}`).join("\n\n")}\n\n${cta}\n\n${hashtags.join(" ")}`

    return {
      format: input.format,
      tone: input.tone,
      headline,
      bodyText: body,
      callToAction: cta,
      hashtags,
      fullText,
      videoScenes: scenes,
      characterCount: fullText.length,
      recommendedPlatform: platform,
    }
  }

  if (input.format === "INSTA_CAPTION") {
    platform = "Instagram"
    body =
      input.tone === "SANG_TRONG"
        ? `Từng cánh ${flowers} khẽ chạm cảm xúc. ${input.productName} mang sắc thái riêng biệt cho những tâm hồn trân quý cái đẹp.`
        : `Gói ghém bình yên vào từng đóa hoa. ${input.productName} sẵn sàng mang nụ cười đến người bạn yêu thương nhất. ✨`
    cta = "Direct để chúng mình chuẩn bị sản phẩm cho bạn trong ngày."
  } else if (input.format === "SHORT_STATUS") {
    platform = "Story / Zalo Feed"
    body = `Hôm nay tiệm vừa hoàn thiện mẫu ${input.productName} với ${color}. Tươi tắn và đong đầy ý nghĩa cho dịp ${occasion}!`
    cta = "Chạm để nhắn tin đặt giữ sản phẩm này nhé!"
  } else if (input.format === "WEB_DESCRIPTION") {
    platform = "Website Catalog"
    body = `Sản phẩm ${input.productName} là sự kết hợp nghệ thuật giữa ${flowers} trên nền ${color}.\nĐược cắm theo phong cách hiện đại, phù hợp hoàn hảo cho ${occasion}.\nCam kết: Sản phẩm mới mỗi ngày, tặng kèm thiệp thiết kế và banner chúc mừng cao cấp.\nGiá niêm yết: ${priceFormatted}.`
    cta = "Thêm vào giỏ hàng hoặc liên hệ chuyên viên chế tác để tùy chỉnh màu sắc."
  } else {
    // FB_POST, FB_ADS, SALES_PITCH, LONG_STORY
    platform = "Facebook"
    if (input.tone === "SANG_TRONG") {
      body = `Hoa không chỉ là món quà, hoa là ngôn ngữ của sự trân quý.\n\nThiết kế ${input.productName} được nghệ nhân chế tác của ${brand} sáng tạo riêng với ${flowers}. Trên nền ${color}, mỗi thành phần mở ra một phong thái đài các, trang nhã khó hòa lẫn.\n\nCho dù là lời tri ân đối tác hay lời yêu thương gửi tới người trân quý, ${input.productName} chính là thông điệp đẳng cấp nhất.`
    } else if (input.tone === "TRE_TRUNG") {
      body = `Ai bảo tặng hoa là sến sẩm? Ngắm ngay mẫu ${input.productName} này là xiêu lòng liền nè! 🌸\n\nPhối màu ${color} siêu ngọt ngào cùng ${flowers}, cầm trên tay check-in là bảo đảm trăm like. Nhất là dịp ${occasion}, tặng bó này thì người ấy chỉ có "say đắm" thui!`
    } else if (input.tone === "AM_AP") {
      body = `Có những điều khó nói thành lời, hãy để những đóa hoa thì thầm thay bạn.\n\n${input.productName} gói ghém sự chân thành với ${flowers} tươi thắm hòa cùng ${color}, rạng rỡ như nụ cười của người nhận trong ngày ${occasion}.\n\nMỗi sản phẩm trao đi là một niềm hạnh phúc được nhân đôi.`
    } else {
      body = `Bạn đang tìm kiếm sản phẩm hoàn hảo cho dịp ${occasion}?\n\n${input.productName} là lựa chọn hàng đầu tại ${brand} với ${flowers}, phối sắc ${color} sang trọng và bền tươi suốt nhiều ngày.\n\nĐặc quyền đặt hoa hôm nay: Miễn phí thiệp viết tay cao cấp + Giao nhanh tận nơi chuẩn hẹn.`
    }
    cta = `👉 Nhắn tin cho Fanpage hoặc Hotline để đặt hoa và giao nhanh trong 2 giờ!`
  }

  const fullText = `${headline}\n\n${body}\n\n${cta}\n\n${hashtags.join(" ")}`

  return {
    format: input.format,
    tone: input.tone,
    headline,
    bodyText: body,
    callToAction: cta,
    hashtags,
    fullText,
    characterCount: fullText.length,
    recommendedPlatform: platform,
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
}
