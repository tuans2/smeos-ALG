/**
 * banner-template-generator.ts — Bộ sinh nội dung mẫu tức thì cho Phương án 2 (Template Fallback).
 * Hoạt động 100% offline/local, không phụ thuộc external API, trung lập đa ngành.
 */

import type { BannerCopyPayload, BannerStylePresetId } from "./banner-types"

interface TemplatePresetOption {
  readonly headline: string
  readonly subHeadline: string
  readonly promotionBadge: string
  readonly ctaText: string
  readonly validityText: string
  readonly recommendedPreset: BannerStylePresetId
}

const DEFAULT_TEMPLATES_BY_OCCASION: Record<string, TemplatePresetOption> = {
  FLASH_SALE: {
    headline: "FLASH SALE CUỐI TUẦN",
    subHeadline: "Ghé tiệm hoặc nhắn tin để chọn mẫu ưng ý",
    promotionBadge: "GIẢM ĐẾN 50%",
    ctaText: "MUA NGAY KẺO LỠ",
    validityText: "Chỉ áp dụng trong hôm nay",
    recommendedPreset: "VIBRANT_SALE",
  },
  GRAND_OPENING: {
    headline: "MỪNG KHAI TRƯƠNG — HÂN HẠNH ĐÓN KHÁCH",
    subHeadline: "Hân hạnh chào đón quý khách ghé thăm cửa hàng",
    promotionBadge: "TẶNG BĂNG RÔN & GIẢM 20%",
    ctaText: "GHÉ CỬA HÀNG NGAY",
    validityText: "Tuần lễ khai trương",
    recommendedPreset: "FESTIVE_SEASON",
  },
  HOLIDAY_WOMEN: {
    headline: "TRAO GỬI YÊU THƯƠNG — TÔN VINH PHÁI ĐẸP",
    subHeadline: "Món quà tinh tế thay lời tri ân ngọt ngào nhất gửi đến những người phụ nữ bạn yêu quý",
    promotionBadge: "TẶNG THIỆP & FREESHIP",
    ctaText: "ĐẶT QUÀ NGAY",
    validityText: "Ưu đãi đặt sớm trước ngày lễ",
    recommendedPreset: "ELEGANT_LUXURY",
  },
  BIRTHDAY: {
    headline: "CHÚC MỪNG SINH NHẬT — TRỌN VẸN YÊU THƯƠNG",
    subHeadline: "Gửi trao bất ngờ ngọt ngào với những mẫu thiết kế độc bản rực rỡ nhất",
    promotionBadge: "TẶNG THIỆP CAO CẤP",
    ctaText: "ĐẶT MẪU NGAY",
    validityText: "Giao tận tay đúng hẹn",
    recommendedPreset: "ELEGANT_LUXURY",
  },
  SEASON_CLEARANCE: {
    headline: "ĐÓN MÙA MỚI — LÀM MỚI BỘ SƯU TẬP",
    subHeadline: "Những mẫu tuyển chọn đang có sẵn tại tiệm",
    promotionBadge: "MUA 1 TẶNG 1",
    ctaText: "XEM MẪU NGAY",
    validityText: "Đến khi hết số lượng quà tặng",
    recommendedPreset: "VIBRANT_SALE",
  },
  NEW_COLLECTION: {
    headline: "BỘ SƯU TẬP MỚI — ĐỘC BẢN TINH TẾ",
    subHeadline: "Tuyển chọn những thiết kế đương đại mang dấu ấn phong cách riêng biệt",
    promotionBadge: "NEW ARRIVAL",
    ctaText: "KHÁM PHÁ NGAY",
    validityText: "Số lượng giới hạn",
    recommendedPreset: "MODERN_MINIMAL",
  },
  DEFAULT: {
    headline: "MẪU ĐẸP — DÀNH RIÊNG CHO BẠN",
    subHeadline: "Tuyển chọn những sản phẩm chất lượng cao từ tiệm",
    promotionBadge: "ƯU ĐÃI ĐỘC QUYỀN",
    ctaText: "XEM MẪU NGAY",
    validityText: "Số lượng có hạn",
    recommendedPreset: "MODERN_MINIMAL",
  },
}

export function getInstantBannerTemplate(occasionKey?: string): TemplatePresetOption {
  if (!occasionKey) return DEFAULT_TEMPLATES_BY_OCCASION.DEFAULT!

  const upper = occasionKey.toUpperCase()
  if (upper.includes("FLASH") || upper.includes("SALE")) {
    return DEFAULT_TEMPLATES_BY_OCCASION.FLASH_SALE!
  }
  if (upper.includes("KHAI_TRUONG") || upper.includes("OPENING")) {
    return DEFAULT_TEMPLATES_BY_OCCASION.GRAND_OPENING!
  }
  if (upper.includes("BIRTHDAY") || upper.includes("SINH_NHAT")) {
    return DEFAULT_TEMPLATES_BY_OCCASION.BIRTHDAY!
  }
  if (
    upper.includes("20_10") ||
    upper.includes("8_3") ||
    upper.includes("WOMEN") ||
    upper.includes("VALENTINE") ||
    upper.includes("LOVE") ||
    upper.includes("TEACHER")
  ) {
    return DEFAULT_TEMPLATES_BY_OCCASION.HOLIDAY_WOMEN!
  }
  if (upper.includes("NEW") || upper.includes("COLLECTION") || upper.includes("MAU_MOI")) {
    return DEFAULT_TEMPLATES_BY_OCCASION.NEW_COLLECTION!
  }
  if (upper.includes("CLEARANCE") || upper.includes("XA_KHO") || upper.includes("DON_KHO")) {
    return DEFAULT_TEMPLATES_BY_OCCASION.SEASON_CLEARANCE!
  }

  return DEFAULT_TEMPLATES_BY_OCCASION.DEFAULT!
}

export function generateInstantBannerCopy(params: {
  occasionKey?: string | undefined
  shopName?: string | undefined
  productTitle?: string | undefined
  suggestedPromotion?: string | undefined
}): BannerCopyPayload {
  const tpl = getInstantBannerTemplate(params.occasionKey)
  return {
    headline: tpl.headline,
    subHeadline: params.productTitle
      ? `${tpl.subHeadline} với sản phẩm nổi bật "${params.productTitle}".`
      : tpl.subHeadline,
    // Ưu đãi và thời hạn in lên ấn phẩm chỉ khi cửa hàng nhập — mẫu không tự hứa "giảm 50%", "chỉ hôm nay"…
    promotionBadge: params.suggestedPromotion ?? "",
    ctaText: tpl.ctaText,
    validityText: "",
  }
}
