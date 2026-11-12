/**
 * THƯ VIỆN TAXONOMY & KEYWORDS THỊ TRƯỜNG HOA TƯƠI — ALG INTELLIGENCE ENGINE
 * 
 * Chuẩn hóa 10 phân nhóm nghiệp vụ:
 * - 01. OCCASION (30 keywords) — Dịp lễ & Nhu cầu
 * - 02. SEASONAL (20 keywords) — Mùa vụ & Ngày lễ
 * - 03. PRODUCT_FORM (25 keywords) — Quy cách sản phẩm
 * - 04. FLOWER_MATERIAL (30 keywords) — Loài hoa & Nguyên liệu
 * - 05. STYLE_AESTHETIC (30 keywords) — Phong cách cắm & Thẩm mỹ
 * - 06. COLOR_VISUAL (25 keywords) — Màu sắc & Phối màu
 * - 07. WRAPPING_MATERIAL (15 keywords) — Giấy gói & Phụ liệu
 * - 08. NOVELTY_ADDON (20 keywords) — Sản phẩm đột phá & Quà kèm
 * - 09. SOCIAL_VIRAL (15 keywords) — Tín hiệu mạng xã hội TikTok/Reels
 * - 10. COMMERCIAL_MODIFIERS — Thư viện Ý định thương mại (Nhu cầu, Tầm giá, Mua hàng, Nội dung)
 * 
 * Tổng cộng: 210 Core Keywords + 20 Signal Modifiers.
 */

export interface TaxonomyCategory {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  readonly icon: string;
  readonly keywords: readonly string[];
}

export const OCCASION_KEYWORDS: readonly string[] = [
  // Sinh nhật
  "Hoa sinh nhật đẹp",
  "Bó hoa sinh nhật",
  "Hoa sinh nhật bạn gái",
  "Hoa sinh nhật bạn trai",
  "Hoa sinh nhật mẹ",
  "Hoa sinh nhật vợ",
  "Hoa sinh nhật sang trọng",
  "Hoa sinh nhật pastel",
  // Tình yêu & kỷ niệm
  "Hoa tặng người yêu",
  "Hoa tặng bạn gái",
  "Hoa tặng vợ",
  "Hoa kỷ niệm tình yêu",
  "Hoa cầu hôn",
  "Hoa Valentine",
  "Bó hoa Valentine",
  "Hoa anniversary",
  // Gia đình
  "Hoa tặng mẹ",
  "Hoa tặng bố",
  "Hoa tặng gia đình",
  "Hoa tặng người thân",
  // Chúc mừng
  "Hoa tốt nghiệp",
  "Bó hoa tốt nghiệp",
  "Hoa khai trương",
  "Kệ hoa khai trương",
  "Hoa chúc mừng",
  "Hoa thăng chức",
  // Sự kiện
  "Hoa cưới",
  "Hoa đám cưới",
  "Hoa hội nghị",
  "Hoa sự kiện",
];

export const SEASONAL_KEYWORDS: readonly string[] = [
  "Hoa 8/3",
  "Hoa ngày Quốc tế Phụ nữ",
  "Hoa 20/10",
  "Hoa ngày Nhà giáo Việt Nam",
  "Hoa 20/11",
  "Hoa Noel",
  "Hoa Giáng sinh",
  "Hoa Tết",
  "Hoa Tết Nguyên Đán",
  "Hoa ngày của mẹ",
  "Hoa ngày của cha",
  "Hoa Trung thu",
  "Hoa mùa xuân",
  "Hoa mùa hè",
  "Hoa mùa thu",
  "Hoa mùa đông",
  "Hoa cưới mùa thu",
  "Hoa cưới mùa đông",
  "Hoa cưới mùa xuân",
  "Hoa cưới mùa hè",
];

export const PRODUCT_FORM_KEYWORDS: readonly string[] = [
  "Bó hoa đẹp",
  "Bó hoa cao cấp",
  "Bó hoa mini",
  "Bó hoa khổng lồ",
  "Bó hoa cầm tay",
  "Bó hoa tròn",
  "Bó hoa dáng dài",
  "Bó hoa tự nhiên",
  "Bó hoa phong cách Hàn",
  "Bó hoa phong cách Âu",
  "Giỏ hoa đẹp",
  "Giỏ hoa cao cấp",
  "Giỏ hoa pastel",
  "Giỏ hoa vintage",
  "Giỏ hoa chúc mừng",
  "Hộp hoa đẹp",
  "Hộp hoa cao cấp",
  "Hộp hoa mica",
  "Hộp hoa sinh nhật",
  "Hộp hoa quà tặng",
  "Lẵng hoa đẹp",
  "Kệ hoa đẹp",
  "Hoa để bàn",
  "Hoa cắm bình",
  "Hoa trang trí sự kiện",
];

export const FLOWER_MATERIAL_KEYWORDS: readonly string[] = [
  "Hoa hồng nhập khẩu",
  "Hoa hồng Ecuador",
  "Hoa hồng Ohara",
  "Hoa hồng David Austin",
  "Hoa hồng spray",
  "Hoa tulip nhập khẩu",
  "Hoa tulip pastel",
  "Hoa tulip Hàn Quốc",
  "Hoa tulip Hà Lan",
  "Bó hoa tulip đẹp",
  "Hoa mẫu đơn nhập khẩu",
  "Hoa mẫu đơn Hà Lan",
  "Hoa mẫu đơn hồng",
  "Hoa mẫu đơn trắng",
  "Bó hoa mẫu đơn",
  "Hoa baby trắng",
  "Hoa baby hồng",
  "Hoa baby khổng lồ",
  "Bó hoa baby đẹp",
  "Hoa cẩm tú cầu",
  "Hoa cẩm tú cầu xanh",
  "Hoa cẩm tú cầu nhập khẩu",
  "Hoa cẩm tú cầu pastel",
  "Hoa hướng dương",
  "Bó hoa hướng dương",
  "Hoa lan hồ điệp",
  "Lan hồ điệp mini",
  "Lan hồ điệp để bàn",
  "Hoa mao lương",
  "Hoa ranunculus",
];

export const STYLE_AESTHETIC_KEYWORDS: readonly string[] = [
  "Bó hoa phong cách Hàn Quốc",
  "Hoa phong cách Hàn Quốc",
  "Hoa phong cách châu Âu",
  "Hoa phong cách Nhật Bản",
  "Hoa phong cách tối giản",
  "Hoa phong cách vintage",
  "Hoa phong cách luxury",
  "Hoa phong cách romantic",
  "Hoa phong cách natural",
  "Hoa phong cách garden",
  "Hoa phong cách hiện đại",
  "Hoa phong cách thanh lịch",
  "Hoa phong cách sang trọng",
  "Hoa phong cách trẻ trung",
  "Hoa phong cách nữ tính",
  "Bó hoa minimal",
  "Bó hoa vintage",
  "Bó hoa luxury",
  "Bó hoa romantic",
  "Bó hoa garden",
  "Hoa aesthetic Hàn Quốc",
  "Hoa aesthetic vintage",
  "Hoa aesthetic tối giản",
  "Hoa aesthetic luxury",
  "Hoa aesthetic romantic",
  "Bó hoa natural",
  "Bó hoa phá cách",
  "Bó hoa nghệ thuật",
  "Bó hoa editorial",
  "Bó hoa độc đáo",
];

export const COLOR_VISUAL_KEYWORDS: readonly string[] = [
  "Hoa tone pastel",
  "Hoa tone hồng",
  "Hoa tone trắng",
  "Hoa tone đỏ",
  "Hoa tone cam",
  "Hoa tone vàng",
  "Hoa tone tím",
  "Hoa tone xanh",
  "Hoa tone nude",
  "Hoa tone be",
  "Hoa tone peach",
  "Hoa tone coral",
  "Hoa tone burgundy",
  "Hoa tone wine",
  "Hoa tone lavender",
  "Hoa tone xanh trắng",
  "Hoa tone hồng trắng",
  "Hoa tone cam trắng",
  "Hoa tone đỏ trắng",
  "Hoa tone vàng cam",
  "Bó hoa pastel",
  "Bó hoa monochrome",
  "Bó hoa phối màu",
  "Hoa tone tự nhiên",
  "Hoa tone tương phản",
];

export const WRAPPING_MATERIAL_KEYWORDS: readonly string[] = [
  "Bó hoa giấy kraft",
  "Bó hoa giấy lụa",
  "Bó hoa giấy Hàn Quốc",
  "Bó hoa giấy vintage",
  "Bó hoa giấy trong",
  "Hoa gói giấy pastel",
  "Hoa gói giấy trắng",
  "Hoa gói giấy nâu",
  "Hoa gói giấy xanh",
  "Hoa gói giấy tối giản",
  "Bó hoa không giấy",
  "Bó hoa phong cách tự nhiên",
  "Bó hoa giấy cao cấp",
  "Giấy gói hoa Hàn Quốc",
  "Giấy gói hoa vintage",
];

export const NOVELTY_ADDON_KEYWORDS: readonly string[] = [
  "Bó hoa kèm gấu bông",
  "Hộp hoa kèm gấu",
  "Bó hoa kèm chocolate",
  "Hoa kèm quà tặng",
  "Hoa kèm nến thơm",
  "Bó hoa bóng bay",
  "Bó hoa bóng bay jumbo",
  "Hoa kèm bánh sinh nhật",
  "Hoa kèm nước hoa",
  "Hoa kèm mỹ phẩm",
  "Bó hoa tiền",
  "Bó hoa tiền tài lộc",
  "Hoa tiền mừng cưới",
  "Hoa tiền khai trương",
  "Hoa tiền sinh nhật",
  "Hộp quà hoa",
  "Flower gift box",
  "Hoa kết hợp quà",
  "Hoa và chocolate",
  "Hoa và gấu bông",
];

export const SOCIAL_VIRAL_KEYWORDS: readonly string[] = [
  "Hoa viral TikTok",
  "Bó hoa viral TikTok",
  "Hoa hot TikTok",
  "Hoa trend TikTok",
  "Florist trend TikTok",
  "Hoa viral Instagram",
  "Hoa trend Instagram",
  "Bó hoa trending",
  "Mẫu hoa viral",
  "Mẫu hoa đang hot",
  "Flower bouquet trend",
  "Flower aesthetic trend",
  "Viral flower bouquet",
  "Trending bouquet",
  "Florist trend",
];

export const COMMERCIAL_MODIFIERS = {
  demand: [
    "Hoa được tìm kiếm nhiều",
    "Mẫu hoa được tìm kiếm",
    "Hoa đang được quan tâm",
    "Hoa đang tăng nhu cầu",
    "Mẫu hoa bán chạy",
  ],
  price: [
    "Hoa giá dưới 300K",
    "Hoa giá dưới 500K",
    "Hoa giá dưới 1 triệu",
    "Bó hoa 500K",
    "Bó hoa 1 triệu",
  ],
  purchaseIntent: [
    "Mua hoa sinh nhật",
    "Mua hoa tặng mẹ",
    "Mua hoa tặng người yêu",
    "Đặt hoa online",
    "Đặt hoa giao nhanh",
  ],
  content: [
    "Ý tưởng bó hoa",
    "Ý tưởng tặng hoa",
    "Cách chọn hoa",
    "Ý nghĩa các loài hoa",
    "Mẫu hoa đẹp",
  ],
} as const;

export const MARKET_TAXONOMY_CATEGORIES: readonly TaxonomyCategory[] = [
  {
    id: "01_occasion",
    code: "OCCASION",
    name: "Dịp lễ & Nhu cầu tặng",
    shortName: "Dịp lễ",
    description: "Sinh nhật, kỷ niệm, chúc mừng, tốt nghiệp, khai trương, sự kiện",
    icon: "Calendar",
    keywords: OCCASION_KEYWORDS,
  },
  {
    id: "02_seasonal",
    code: "SEASONAL",
    name: "Mùa vụ & Ngày lễ trong năm",
    shortName: "Mùa vụ",
    description: "20/10, 8/3, 20/11, Valentine, Tết, mùa cưới, mùa kỷ yếu",
    icon: "Sparkles",
    keywords: SEASONAL_KEYWORDS,
  },
  {
    id: "03_product_form",
    code: "PRODUCT_FORM",
    name: "Quy cách & Dáng sản phẩm",
    shortName: "Quy cách",
    description: "Bó hoa tròn, bó dài, giỏ hoa, hộp mica, kệ chúc mừng, bình hoa",
    icon: "Package",
    keywords: PRODUCT_FORM_KEYWORDS,
  },
  {
    id: "04_flower_material",
    code: "FLOWER_MATERIAL",
    name: "Loài hoa & Nguyên liệu",
    shortName: "Loài hoa",
    description: "Hoa hồng Ohara/Ecuador, tulip, mẫu đơn, baby, cẩm tú cầu, lan hồ điệp",
    icon: "Flower2",
    keywords: FLOWER_MATERIAL_KEYWORDS,
  },
  {
    id: "05_style_aesthetic",
    code: "STYLE_AESTHETIC",
    name: "Phong cách & Thẩm mỹ",
    shortName: "Phong cách",
    description: "Hàn Quốc, Vintage, Luxury, Tối giản, Garden tự nhiên, Hiện đại",
    icon: "Palette",
    keywords: STYLE_AESTHETIC_KEYWORDS,
  },
  {
    id: "06_color_visual",
    code: "COLOR_VISUAL",
    name: "Màu sắc & Phối màu",
    shortName: "Màu sắc",
    description: "Tone pastel, cam cháy, đỏ trắng, xanh bơ, peach, burgundy, wine",
    icon: "Droplets",
    keywords: COLOR_VISUAL_KEYWORDS,
  },
  {
    id: "07_wrapping_material",
    code: "WRAPPING_MATERIAL",
    name: "Giấy gói & Vật liệu phụ trợ",
    shortName: "Giấy gói",
    description: "Giấy kraft, giấy lụa, giấy trong, giấy Hàn Quốc, bó không giấy",
    icon: "Layers",
    keywords: WRAPPING_MATERIAL_KEYWORDS,
  },
  {
    id: "08_novelty_addon",
    code: "NOVELTY_ADDON",
    name: "Sản phẩm đột phá & Quà kèm",
    shortName: "Đột phá",
    description: "Bó hoa kèm gấu, hoa bóng bay jumbo, hoa tiền, hộp quà nến thơm",
    icon: "Gift",
    keywords: NOVELTY_ADDON_KEYWORDS,
  },
  {
    id: "09_social_viral",
    code: "SOCIAL_VIRAL",
    name: "Tín hiệu Mạng xã hội & Viral",
    shortName: "Viral TikTok",
    description: "Hashtag thịnh hành TikTok, video triệu view, phong cách florist hot",
    icon: "TrendingUp",
    keywords: SOCIAL_VIRAL_KEYWORDS,
  },
];

/** Toàn bộ 210 từ khóa cốt lõi phẳng */
export const ALL_CORE_KEYWORDS: readonly string[] = Array.from(
  new Set([
    ...OCCASION_KEYWORDS,
    ...SEASONAL_KEYWORDS,
    ...PRODUCT_FORM_KEYWORDS,
    ...FLOWER_MATERIAL_KEYWORDS,
    ...STYLE_AESTHETIC_KEYWORDS,
    ...COLOR_VISUAL_KEYWORDS,
    ...WRAPPING_MATERIAL_KEYWORDS,
    ...NOVELTY_ADDON_KEYWORDS,
    ...SOCIAL_VIRAL_KEYWORDS,
  ])
);

/** Gợi ý bộ từ khóa theo mùa vụ thông minh (tháng hiện tại) */
export function getSeasonalRecommendedKeywords(targetMonth?: number): string[] {
  const month = targetMonth ?? new Date().getMonth() + 1;

  if (month === 9 || month === 10) {
    // Mùa thu, Tốt nghiệp, 20/10, Mùa cưới thu-đông
    return [
      "Hoa 20/10",
      "Bó hoa tốt nghiệp hướng dương",
      "Hoa cưới mùa thu",
      "Hoa cưới tone cam cháy",
      "Giỏ hoa pastel",
      "Hoa tulip pastel Hàn Quốc",
      "Hoa mẫu đơn nhập khẩu",
      "Hộp hoa quà tặng",
      "Bó hoa kèm gấu bông",
      "Hoa viral TikTok",
    ];
  }

  if (month === 11) {
    // 20/11 Nhà giáo Việt Nam
    return [
      "Hoa 20/11",
      "Hoa ngày Nhà giáo Việt Nam",
      "Giỏ hoa chúc mừng",
      "Lan hồ điệp để bàn",
      "Hoa hướng dương",
      "Bó hoa hồng Ohara",
    ];
  }

  if (month === 12 || month === 1) {
    // Noel & Tết
    return [
      "Hoa Noel",
      "Hoa Giáng sinh",
      "Hoa Tết",
      "Hoa Tết Nguyên Đán",
      "Lan hồ điệp khai trương",
      "Hoa tone đỏ",
    ];
  }

  if (month === 2 || month === 3) {
    // Valentine & 8/3
    return [
      "Hoa Valentine",
      "Bó hoa Valentine",
      "Hoa 8/3",
      "Hoa ngày Quốc tế Phụ nữ",
      "Hoa hồng Ecuador",
      "Bó hoa tulip đẹp",
    ];
  }

  // Mặc định các dịp phổ biến
  return [
    "Hoa sinh nhật đẹp",
    "Bó hoa sinh nhật sang trọng",
    "Hoa khai trương",
    "Bó hoa phong cách Hàn Quốc",
    "Hoa tulip pastel",
    "Hoa mẫu đơn nhập khẩu",
    "Bó hoa viral TikTok",
  ];
}

/**
 * Cơ chế 3: Quét xoay vòng theo ngày trong tuần (Daily Group Rotation)
 * Phân bổ luân phiên 210 từ khóa qua 7 ngày để tối ưu hóa quota và chống rate limit.
 */
export function getDailyRotatedKeywords(targetDate?: Date): string[] {
  const day = (targetDate ?? new Date()).getDay(); // 0: CN, 1: T2, 2: T3, 3: T4, 4: T5, 5: T6, 6: T7

  switch (day) {
    case 1: // Thứ Hai: Dịp lễ & Nhu cầu (01_OCCASION)
      return OCCASION_KEYWORDS.slice(0, 15);
    case 2: // Thứ Ba: Loài hoa & Nguyên liệu (04_FLOWER_MATERIAL)
      return FLOWER_MATERIAL_KEYWORDS.slice(0, 15);
    case 3: // Thứ Tư: Phong cách & Thẩm mỹ (05_STYLE_AESTHETIC)
      return STYLE_AESTHETIC_KEYWORDS.slice(0, 15);
    case 4: // Thứ Năm: Màu sắc & Giấy gói (06_COLOR + 07_WRAPPING)
      return [...COLOR_VISUAL_KEYWORDS.slice(0, 10), ...WRAPPING_MATERIAL_KEYWORDS.slice(0, 5)];
    case 5: // Thứ Sáu: Đột phá & Viral TikTok (08_NOVELTY + 09_VIRAL)
      return [...NOVELTY_ADDON_KEYWORDS.slice(0, 8), ...SOCIAL_VIRAL_KEYWORDS.slice(0, 7)];
    case 6: // Thứ Bảy: Quy cách & Dáng sản phẩm (03_PRODUCT_FORM)
      return PRODUCT_FORM_KEYWORDS.slice(0, 15);
    case 0: // Chủ Nhật: Mùa vụ hiện tại & Xu hướng đón đầu
    default:
      return getSeasonalRecommendedKeywords();
  }
}
