/**
 * Landing Page 7-Section Content Generator.
 * Hợp nhất 3 nguồn: Business Profile + Dynamic Market/Product Signals + User Directives.
 * Pure Domain - Không phụ thuộc DB hay mạng.
 */

import { type ToneOfVoice } from "./flower-content-presets"
import { sanitizeFlowerText } from "./flower-banned-dictionary"

export interface LandingContentInput {
  shopName: string
  shopTone?: ToneOfVoice | string | undefined
  occasionId: string
  occasionLabel: string
  archetypeId?: string | undefined
  selectedProducts: Array<{
    name: string
    code?: string | undefined
    price?: number | null | undefined
    category?: string | null | undefined
    /** Ghi chú bán hàng đã duyệt (máy chủ tự đọc, không nhận từ trình duyệt) */
    sellingNote?: string | undefined
  }>
  userDirectives?: string | undefined
  discountPercent?: number | undefined
  pageGoal?: string | undefined
  usps?: string[] | undefined
  guarantees?: string[] | undefined
  targetAudience?: string | undefined
  designDirection?: string | undefined
}

export interface LandingSectionHero {
  badge: string
  headline: string
  subHeadline: string
  countdownLabel: string
}

export interface LandingSectionStory {
  title: string
  paragraphs: string[]
  quote: string
  floristName: string
}

export interface LandingSectionPerk {
  id: string
  title: string
  description: string
  icon: "camera" | "clock" | "shield" | "gift"
}

export interface LandingSectionStep {
  step: number
  title: string
  description: string
}

export interface LandingSectionFaq {
  question: string
  answer: string
}

export interface LandingSectionLead {
  tag: string
  title: string
  description: string
  discountBadge: string
  urgencyNotice: string
}

export interface GeneratedLandingPackage {
  hero: LandingSectionHero
  story: LandingSectionStory
  perks: LandingSectionPerk[]
  steps: LandingSectionStep[]
  faq: LandingSectionFaq[]
  lead: LandingSectionLead
}

/**
 * Sinh gói nội dung hoàn chỉnh cho 7 Sections của Landing Page
 */
export function generateLandingPageContent(input: LandingContentInput): GeneratedLandingPackage {
  const shop = input.shopName || "Tiệm hoa ALG"
  const occasion = input.occasionLabel || "Dịp Đặc Biệt"
  const directive = input.userDirectives ? sanitizeFlowerText(input.userDirectives) : ""
  // Ưu đãi chỉ khi tiệm bật "Giảm %" trong Hồ sơ tiệm — không có thì không hứa giảm giá
  const discount = input.discountPercent

  const primaryProduct = input.selectedProducts[0]?.name || "các mẫu của tiệm"
  const flowerCount = input.selectedProducts.length

  // 1. Hero — câu cụ thể, không sáo rỗng, không hứa điều tiệm chưa khai (bản dự phòng khi AI không chạy)
  const heroBadge = `Mùa ${occasion}`
  const named = input.selectedProducts[0]?.name
  const heroByOccasion: Record<string, { headline: string; sub: string }> = {
    "20-10": {
      headline: `Hoa tặng mẹ, vợ, người thương dịp ${occasion}`,
      sub: `${shop} chọn sẵn ${flowerCount > 0 ? `${flowerCount} mẫu` : "những mẫu"} cho ngày này — xem ảnh thật, chọn mẫu và nhắn tiệm để giữ hoa.`,
    },
    "valentine": {
      headline: `Hoa cho người thương — ${occasion}`,
      sub: `Những mẫu ${shop} chuẩn bị cho ngày Lễ Tình Nhân. Chọn mẫu bạn thích, tiệm kèm lời nhắn của bạn.`,
    },
    "khai-truong": {
      headline: `Hoa chúc mừng ${occasion}`,
      sub: `Kệ và giỏ hoa chúc mừng từ ${shop} — chọn mẫu, gửi tên người nhận và lời chúc, tiệm liên hệ xác nhận.`,
    },
  }
  const pickedVariant = heroByOccasion[input.occasionId] ?? {
    headline: named ? `${named} cho dịp ${occasion}` : `Hoa cho dịp ${occasion}`,
    sub: `Những mẫu ${shop} chọn cho dịp này — xem ảnh thật, chọn mẫu và nhắn tiệm để đặt.`,
  }
  const heroHeadline = pickedVariant.headline
  let heroSubHeadline = pickedVariant.sub

  if (directive) {
    heroSubHeadline += ` Điểm nhấn: ${directive}.`
  }

  // 2. Câu chuyện — ngắn, thật, không phóng đại
  const storyTitle = `Về ${shop}`
  const storyParagraphs = [
    `${shop} chuẩn bị quà cho những dịp quan trọng của khách quen. Với ${occasion}, tiệm chọn mẫu theo màu và kiểu dáng dễ tặng, dễ trưng.`,
    `${flowerCount > 0 ? `Bộ sưu tập có ${flowerCount} mẫu` : "Bộ sưu tập"}, tiêu biểu như ${primaryProduct}. Bạn cần đổi màu hay thêm thiệp, cứ nhắn tiệm.`,
  ]
  const storyQuote = "Hoa đẹp nhất là khi đến đúng người, đúng lúc."

  // 3. Điểm nổi bật mẫu — không cam kết số giờ, số ngày hay quà tặng khi cửa hàng chưa xác nhận (nội dung lên trang công khai).
  const perks: LandingSectionPerk[] = [
    {
      id: "perk-1",
      title: "Xem ảnh mẫu trước khi đặt",
      description: "Mỗi mẫu trên trang đều có ảnh để bạn chọn đúng thiết kế mình thích.",
      icon: "camera",
    },
    {
      id: "perk-2",
      title: "Giao tận nơi theo hẹn",
      description: "Tiệm liên hệ xác nhận địa chỉ và giờ giao khi bạn đặt.",
      icon: "clock",
    },
    {
      id: "perk-3",
      title: "Chăm chút từng thiết kế",
      description: "Mỗi thiết kế được cắm và kiểm tra kỹ trước khi giao.",
      icon: "shield",
    },
    {
      id: "perk-4",
      title: "Gửi kèm lời chúc",
      description: "Bạn có thể để lại lời nhắn để tiệm gửi cùng món quà.",
      icon: "gift",
    },
  ]

  // 4. 3-Step Ordering Process
  const steps: LandingSectionStep[] = [
    {
      step: 1,
      title: "Chọn mẫu và lời nhắn",
      description: `Lựa chọn thiết kế yêu thích trong bộ sưu tập ${occasion} và để lại nội dung chúc mừng mong muốn.`,
    },
    {
      step: 2,
      title: "Tiệm xác nhận đơn",
      description: `${shop} liên hệ xác nhận mẫu, địa chỉ và giờ giao với bạn.`,
    },
    {
      step: 3,
      title: "Giao hoa",
      description: "Hoa được giao đến người nhận theo giờ đã hẹn.",
    },
  ]

  // 5. FAQ Questions & Answers
  const faq: LandingSectionFaq[] = [
    {
      question: "Hoa thực tế khi giao có giống hình mẫu trên trang không?",
      answer: `Thành phần có thể thay đổi nhẹ theo mùa. ${shop} sẽ trao đổi với bạn nếu cần thay thế để giữ đúng tone màu và kiểu dáng.`,
    },
    {
      question: "Tôi cần đặt gấp thì có kịp không?",
      answer: `Hãy liên hệ ${shop} qua hotline hoặc Zalo trên trang — tiệm sẽ báo ngay thời gian sớm nhất có thể giao.`,
    },
    {
      question: "Cửa hàng có xuất hóa đơn cho công ty không?",
      answer: "Vui lòng gửi thông tin doanh nghiệp khi đặt hàng để tiệm xác nhận việc xuất hóa đơn.",
    },
    {
      question: "Chính sách đổi trả hoặc bảo hành sản phẩm như thế nào?",
      answer: `Nếu sản phẩm có vấn đề khi nhận, hãy liên hệ ngay ${shop} kèm ảnh để tiệm hỗ trợ theo chính sách của cửa hàng.`,
    },
  ]

  // 6. Lead Capture & Special Promotion
  const lead: LandingSectionLead = discount
    ? {
        tag: "Đặt trước",
        title: `Nhận Ngay Ưu Đãi ${discount}%`,
        description: `Áp dụng cho quý khách đăng ký đặt trước trong chiến dịch "${occasion}" theo ưu đãi đang áp dụng của ${shop}.`,
        discountBadge: `GIẢM ${discount}%`,
        urgencyNotice: "",
      }
    : {
        tag: "Đặt trước",
        title: "Để lại số điện thoại để được tư vấn mẫu",
        description: `${shop} sẽ liên hệ lại để tư vấn và giữ mẫu cho chiến dịch "${occasion}".`,
        discountBadge: "",
        urgencyNotice: "",
      }

  return {
    hero: {
      badge: heroBadge,
      headline: heroHeadline,
      subHeadline: heroSubHeadline,
      countdownLabel: "Ưu đãi đặt sớm còn:",
    },
    story: {
      title: storyTitle,
      paragraphs: storyParagraphs,
      quote: storyQuote,
      floristName: `Nghệ nhân ${shop}`,
    },
    perks,
    steps,
    faq,
    lead,
  }
}
