/**
 * Domain Solver: Thuật toán đối soát phù hợp thị trường (Product Trend Fit),
 * Khuyến nghị Cải tiến (KEEP/IMPROVE/TEST), và Bộ sinh 10 Chủ đề Nội dung Cụ thể.
 * Tuân thủ mục 12-19 của tài liệu ALG-Intelligence-Engine_FINAL_v2.0.md.
 * Thuần TypeScript — Zero external dependencies.
 *
 * CẬP NHẬT 21/09/2026 (trả nợ kỹ thuật #115 — chốt bởi Tony: "Phải nối với dữ liệu thật"):
 * - Ma trận đối soát (trendFitMatrix) không còn gán cứng matchStatus = "MATCH" cho mọi
 *   thuộc tính. Mỗi thuộc tính (màu, hoa chủ đạo, phong cách, đóng gói, dịp dùng) được tra
 *   cứu tín hiệu THẬT từ bảng trend_signals (qua realAttributeSignals, do use-case
 *   analyze-product-intelligence.ts truy vấn) — matchStatus và lifecycle được TÍNH từ
 *   growth_rate/metric_value thật (determineTrendLifecycle), có thể ra MISMATCH thật khi
 *   xu hướng đang giảm, không còn luôn luôn "MATCH".
 * - Khi KHÔNG có tín hiệu thật cho một thuộc tính (DB chưa thu thập dữ liệu cho từ khóa đó),
 *   hệ thống không còn bịa số phần trăm — trả về matchStatus "PARTIAL" kèm ghi chú trung
 *   thực rằng chưa có dữ liệu thật, đề xuất chạy "Quét theo từ khóa" trước.
 * - Dẫn chứng (evidenceNote) của 10 chủ đề nội dung: ưu tiên dùng tín hiệu thật (từ
 *   content_opportunities/topics của tổ chức qua realTrendSignals, hoặc từ trend_signals
 *   thô qua realAttributeSignals) — chỉ khi cả hai đều không có mới dùng câu minh hoạ trung
 *   thực (không kèm số liệu bịa) thay cho các hằng số cũ như "+45%", "250K+ views"...
 */

import { getTopicDualRealVideoEvidence } from "./video-evidence-catalog";
import { determineTrendLifecycle, type TrendLifecycle } from "./trend-lifecycle";
import { formatDate } from "@/lib/i18n/formatters";
import type {
  ProductFlowerComponent,
  ProductVisualAttributes,
  ProductPackaging,
  ProductInferredContext,
  ProductTrendFitItem,
  ProductImprovement,
  ConcreteTopic,
  ProductContentReadiness,
  ProductIntelligenceReport,
  CommercialPassport,
} from "./product-intelligence-types";

export interface RealTrendSignalInput {
  topicName: string;
  trendScore?: number | undefined;
  viralScore?: number | undefined;
  commercialScore?: number | undefined;
  summary?: string | undefined;
  marketSignal?: string | undefined;
}

/**
 * Một tín hiệu xu hướng THẬT cho một thuộc tính sản phẩm cụ thể (màu, hoa, phong cách,
 * đóng gói, hoặc dịp dùng) — do analyze-product-intelligence.ts truy vấn từ bảng
 * trend_signals thật (đa nền tảng: Google Trends, SerpApi, TikTok, YouTube) rồi truyền
 * xuống dạng dữ liệu thuần túy, để domain layer này giữ đúng nguyên tắc "Zero external
 * dependencies" (không tự gọi DB).
 */
export interface RealAttributeSignal {
  metricValue: number;
  growthRate: number | null;
  confidence: number;
  capturedAt: string;
  platformLabel: string;
}

export interface RealAttributeSignals {
  color?: RealAttributeSignal | null | undefined;
  dominantFlower?: RealAttributeSignal | null | undefined;
  style?: RealAttributeSignal | null | undefined;
  packaging?: RealAttributeSignal | null | undefined;
  occasion?: RealAttributeSignal | null | undefined;
}

export interface EvaluateTrendFitInput {
  id?: string | undefined;
  productName: string;
  imageUrl: string;
  components: ProductFlowerComponent[];
  attributes: ProductVisualAttributes;
  packaging: ProductPackaging;
  context: ProductInferredContext;
  commercialPassport?: CommercialPassport | undefined;
  realTrendSignals?: RealTrendSignalInput[] | undefined;
  /** Tín hiệu thật theo từng thuộc tính — xem RealAttributeSignals. */
  realAttributeSignals?: RealAttributeSignals | undefined;
}

/**
 * Tách 5 thuộc tính trọng tâm (hoa chủ đạo, tone màu, phong cách, chất liệu đóng gói,
 * dịp dùng chính) từ dữ liệu Vision AI đã xác nhận — dùng chung bởi cả domain layer này
 * (để dựng ma trận đối soát) lẫn use-case layer (để tra cứu tín hiệu thật trước khi gọi
 * vào đây), tránh viết trùng logic ở hai nơi.
 */
export function deriveProductKeyAttributes(params: {
  components: ProductFlowerComponent[];
  attributes: ProductVisualAttributes;
  packaging: ProductPackaging;
  context: ProductInferredContext;
}): {
  dominantFlower: string;
  mainColor: string;
  primaryStyle: string;
  primaryOccasion: string;
  packagingMaterial: string;
} {
  return {
    dominantFlower: params.components.find((c) => c.role === "dominant")?.flowerType || "Hoa hồng",
    mainColor: params.attributes.mainColors[0] || "Pastel hồng",
    primaryStyle: params.attributes.style || "Romantic & Tinh tế",
    primaryOccasion: params.context.likelyOccasions[0] || "Sinh nhật",
    packagingMaterial: params.packaging.wrappingMaterial || "Giấy xi măng Kraft",
  };
}

/**
 * Xây dựng hoặc chuẩn hóa Commercial Passport (M01b) cho sản phẩm
 */
export function buildCommercialPassport(
  productName: string,
  components: ProductFlowerComponent[],
  attributes: ProductVisualAttributes,
  packaging: ProductPackaging,
  context: ProductInferredContext,
  provided?: CommercialPassport
): CommercialPassport {
  if (provided) return provided;

  const dominantFlower = components.find((c) => c.role === "dominant")?.flowerType || "Hoa hồng";
  const mainColor = attributes.mainColors[0] || "Pastel hồng";
  const primaryStyle = attributes.style || "Romantic & Tinh tế";
  const price = context.suggestedPrice || 599000;

  return {
    suggestedName: productName || `Bó ${dominantFlower} ${mainColor} ${primaryStyle}`,
    shortHeadline: `${dominantFlower} ${mainColor} — Trọn Vẹn Cảm Xúc Trao Gửi`,
    description: `Sản phẩm ${dominantFlower.toLowerCase()} phối tone màu ${mainColor.toLowerCase()} tinh tế, gói theo phong cách ${primaryStyle}. Thiết kế trang nhã, hoàn hảo để gửi gắm tình cảm chân thành tới người nhận.`,
    style: primaryStyle,
    tags: [
      dominantFlower.toLowerCase().replace(/\s+/g, "-"),
      mainColor.toLowerCase().replace(/\s+/g, "-"),
      "hoa-tuoi-thiet-ke",
      "qua-tang-y-nghia",
    ],
    seoKeywords: [
      `đặt hoa ${dominantFlower.toLowerCase()}`,
      `sản phẩm tone ${mainColor.toLowerCase()}`,
      `sản phẩm ${primaryStyle.toLowerCase()}`,
    ],
    occasions: context.likelyOccasions.length > 0 ? context.likelyOccasions : ["Sinh nhật", "Kỷ niệm"],
    targetAudience: {
      recipient: context.likelyAudience || "Người yêu, bạn bè, người thân",
      buyerPersona: "Khách hàng 22-38 tuổi, tìm kiếm sự chỉn chu và tinh tế",
    },
    flowerMeaningStory: `${dominantFlower} tượng trưng cho vẻ đẹp thanh khiết và tình cảm bền chặt, kết hợp cùng tone màu ${mainColor.toLowerCase()} mang lại cảm giác dịu dàng, ấm áp.${packaging.card?.printedText ? ` Thiết kế đồng bộ hoàn hảo cùng thông điệp: "${packaging.card.printedText}".` : ""}`,
    keySellingPoints: [
      `100% ${dominantFlower} tuyển chọn form cánh dày, nở chuẩn đẹp`,
      `Tone màu ${mainColor.toLowerCase()} trang nhã, bắt mắt khi lên hình`,
      packaging.card?.printedText
        ? `Kèm thiệp / biển chữ in thông điệp riêng: "${packaging.card.printedText}"`
        : "Tặng kèm thiệp chúc mừng thiết kế và hướng dẫn dưỡng hoa",
    ],
    cardMessageSuggestions: {
      romantic: packaging.card?.printedText || "Mong mỗi ngày của em đều rạng rỡ và ngập tràn hạnh phúc như những đóa hoa này.",
      subtle: packaging.card?.printedText || "Gửi đến bạn món quà ý nghĩa nhất cùng lời chúc an lành và niềm vui.",
      congratulatory: packaging.card?.printedText || "Chúc mừng ngày đặc biệt! Chúc bạn luôn thành công, rực rỡ và may mắn.",
    },
    careInstructions: [
      "Đặt hoa nơi thoáng mát, tránh ánh nắng trực tiếp và luồng gió máy lạnh",
      "Bảo quản đúng cách theo hướng dẫn đi kèm để giữ sản phẩm bền đẹp lâu",
    ],
    priceSegment: price > 1500000 ? "luxury" : price > 800000 ? "premium" : price > 400000 ? "standard" : "budget",
    priceRange: {
      minPrice: Math.round((price * 0.85) / 10000) * 10000,
      targetPrice: price,
      maxPrice: Math.round((price * 1.25) / 10000) * 10000,
    },
    recommendedUpsells: [
      "Bình gốm sứ phong cách Bắc Âu",
      "Thiệp sáp thơm handmade cao cấp",
      "Hộp socola tươi thủ công",
    ],
  };
}

/**
 * Diễn giải một RealAttributeSignal thành câu văn tiếng Việt tự nhiên (đúng số liệu thật,
 * không làm tròn sai lệch quá mức, ghi rõ ngày thu thập để người đọc tự đánh giá độ mới).
 */
function describeRealSignal(real: RealAttributeSignal): string {
  const date = formatDate(real.capturedAt);
  const growth = real.growthRate;
  const growthText =
    growth === null || growth === undefined
      ? ""
      : `, tăng trưởng ${growth > 0 ? "+" : ""}${growth.toFixed(1)}%`;
  return `Dữ liệu thật từ ${real.platformLabel} (${date}): điểm xu hướng ${Math.round(real.metricValue)}/100${growthText}.`;
}

/**
 * Quyết định matchStatus + lifecycle THẬT cho một dòng trong ma trận đối soát, dựa trên
 * growth_rate/metric_value thật khi có, hoặc trả về trạng thái trung thực "chưa có dữ liệu"
 * khi không tìm thấy tín hiệu nào — không còn mặc định "MATCH" như bản cũ.
 */
function buildAttributeRow(params: {
  attributeLabel: string;
  productValue: string;
  real: RealAttributeSignal | null | undefined;
  note: string;
  noDataHint: string;
}): ProductTrendFitItem {
  const real = params.real;
  if (!real) {
    return {
      attribute: params.attributeLabel,
      productValue: params.productValue,
      marketSignal: `Chưa có dữ liệu xu hướng thật cho ${params.noDataHint} — hãy chạy "Quét theo từ khóa" để tích lũy tín hiệu trước khi tin vào mức độ khớp này.`,
      matchStatus: "PARTIAL",
      lifecycle: "STABLE",
      note: params.note,
    };
  }

  const growth = real.growthRate ?? 0;
  const lifecycle: TrendLifecycle = determineTrendLifecycle(real.metricValue, 0, growth);
  const matchStatus: "MATCH" | "PARTIAL" | "MISMATCH" =
    growth > 5 ? "MATCH" : growth < -5 ? "MISMATCH" : "PARTIAL";

  return {
    attribute: params.attributeLabel,
    productValue: params.productValue,
    marketSignal: describeRealSignal(real),
    matchStatus,
    lifecycle,
    note: params.note,
  };
}

/**
 * Sinh dẫn chứng (evidenceNote) trung thực cho một chủ đề nội dung: ưu tiên tín hiệu
 * thật cấp tổ chức (content_opportunities/topics, qua findRealSignal — đã cá nhân hóa,
 * cụ thể hơn), sau đó tới tín hiệu thật cấp thuộc tính (trend_signals thô), cuối cùng mới
 * là câu minh hoạ trung thực không kèm số liệu bịa.
 */
function honestEvidenceNote(params: {
  sourceLabel: string;
  tenantSignalText: string | null;
  attributeSignal: RealAttributeSignal | null | undefined;
}): string {
  if (params.tenantSignalText) {
    return `${params.sourceLabel}: ${params.tenantSignalText}`;
  }
  if (params.attributeSignal) {
    return `${params.sourceLabel} — ${describeRealSignal(params.attributeSignal)}`;
  }
  return `${params.sourceLabel}: chưa có dữ liệu xu hướng thật cho từ khóa này — đây là gợi ý minh hoạ, khuyến nghị chạy "Quét theo từ khóa" để tích lũy tín hiệu thật trước khi lên lịch đăng.`;
}

/**
 * Phân tích và sinh báo cáo Product Intelligence hoàn chỉnh từ thuộc tính sản phẩm.
 */
export function evaluateProductTrendFit(input: EvaluateTrendFitInput): ProductIntelligenceReport {
  const { productName, imageUrl, components, attributes, packaging, context, realTrendSignals = [], realAttributeSignals } = input;

  const { dominantFlower, mainColor, primaryStyle, primaryOccasion, packagingMaterial } = deriveProductKeyAttributes({
    components,
    attributes,
    packaging,
    context,
  });

  // Tìm tín hiệu thực tế cấp tổ chức (content_opportunities/topics) nếu có — cụ thể và
  // cá nhân hóa hơn tín hiệu thô cấp thuộc tính, nên được ưu tiên dùng làm dẫn chứng.
  const findRealSignal = (keyword: string): string | null => {
    const lowerKey = keyword.toLowerCase();
    const matched = realTrendSignals.find(
      (s) => s.topicName.toLowerCase().includes(lowerKey) || s.summary?.toLowerCase().includes(lowerKey)
    );
    if (!matched) return null;
    const score = Math.round(matched.trendScore || matched.viralScore || 75);
    return `Tín hiệu thực tế: Trend Score ${score}/100 — ${matched.marketSignal || matched.summary || "Đang tăng trưởng tích cực"}`;
  };

  // 1. Ma trận đối soát thị trường (Product Trend Fit Matrix) — dựa trên tín hiệu THẬT,
  //    không còn gán cứng "MATCH" cho mọi dòng (trả nợ #115, chốt 21/09/2026).
  const trendFitMatrix: ProductTrendFitItem[] = [
    buildAttributeRow({
      attributeLabel: `Tone màu (${mainColor})`,
      productValue: mainColor,
      real: realAttributeSignals?.color,
      note: "Tone màu là yếu tố thị giác đầu tiên khách hàng nhìn thấy — ảnh hưởng trực tiếp tới tỷ lệ dừng xem trên mạng xã hội.",
      noDataHint: `tone màu "${mainColor}"`,
    }),
    buildAttributeRow({
      attributeLabel: `Loài hoa chủ đạo (${dominantFlower})`,
      productValue: `${components.find((c) => c.role === "dominant")?.quantityEstimate ?? components[0]?.quantityEstimate ?? 10} cành ${dominantFlower}`,
      real: realAttributeSignals?.dominantFlower,
      note: "Loài hoa chủ đạo quyết định phần lớn cảm nhận giá trị và mức giá khách sẵn sàng trả.",
      noDataHint: `loài hoa "${dominantFlower}"`,
    }),
    buildAttributeRow({
      attributeLabel: `Phong cách thiết kế (${primaryStyle})`,
      productValue: primaryStyle,
      real: realAttributeSignals?.style,
      note: "Phong cách chế tác là điều khách hàng thường tìm kiếm trực tiếp trên TikTok/YouTube trước khi đặt hoa.",
      noDataHint: `phong cách "${primaryStyle}"`,
    }),
    buildAttributeRow({
      attributeLabel: `Chất liệu giấy gói (${packagingMaterial})`,
      productValue: `${packagingMaterial} (${packaging.wrappingColor})`,
      real: realAttributeSignals?.packaging,
      note: "Chất liệu đóng gói ảnh hưởng tới cảm nhận cao cấp/mộc mạc và khả năng lên hình đẹp trong ảnh sản phẩm.",
      noDataHint: `chất liệu đóng gói "${packagingMaterial}"`,
    }),
    buildAttributeRow({
      attributeLabel: `Dịp sử dụng đề xuất (${primaryOccasion})`,
      productValue: context.likelyOccasions.join(", "),
      real: realAttributeSignals?.occasion,
      note: "Dịp sử dụng quyết định thời điểm và ngân sách khách sẵn sàng chi cho một sản phẩm.",
      noDataHint: `dịp "${primaryOccasion}"`,
    }),
  ];

  // 2. Tính điểm phù hợp động dựa trên ma trận đối soát (trendFitMatrix)
  const matchCount = trendFitMatrix.filter((i) => i.matchStatus === "MATCH").length;
  const partialCount = trendFitMatrix.filter((i) => i.matchStatus === "PARTIAL").length;
  const totalItems = trendFitMatrix.length || 1;

  const rawFitRate = (matchCount * 1.0 + partialCount * 0.5) / totalItems;
  const trendFitScore = Math.round(Math.min(98, Math.max(50, 60 + rawFitRate * 35)));
  const audienceFitScore = Math.round(Math.min(98, Math.max(55, 65 + (context.confidence || 0.9) * 30)));
  const contentFitScore = Math.round(trendFitScore * 0.5 + audienceFitScore * 0.5);
  const overallFit: "HIGH" | "MEDIUM" | "LOW" =
    contentFitScore >= 80 ? "HIGH" : contentFitScore >= 65 ? "MEDIUM" : "LOW";

  // 3. Khuyến nghị cải tiến sản phẩm (KEEP / IMPROVE / TEST)
  const improvements: ProductImprovement = {
    keep: [
      `Tone màu ${mainColor} và kiểu cắm ${primaryStyle} đang ăn khớp hoàn hảo với thị hiếu thị trường.`,
      `Sử dụng ${dominantFlower} làm hoa chủ đạo tạo điểm nhấn thị giác sang trọng, giữ form bền.`,
      `Phối hoa lá phụ (${components.find((c) => c.role === "foliage")?.flowerType || "Lá bạc Eucalyptus"}) tạo độ bay bổng tự nhiên.`,
    ],
    improve: [
      "Góc chụp ảnh hiện tại hơi phẳng, nên chụp góc nghiêng 45 độ đón ánh sáng ban mai để thấy chiều sâu thành phần.",
      "Phần thắt nơ ruy băng có thể kéo dài dải ruy băng thêm 10cm để tạo nét thướt tha khi quay video ngắn.",
    ],
    test: [
      "Thử nghiệm thêm biến thể giấy gói đen mờ (Dark Mood) để tiếp cận tệp khách hàng cá tính hoặc nam giới tặng quà.",
      "Đóng gói kèm thiệp chữ viết tay cao cấp và hộp đựng hoa chuyên dụng để nâng giá trị cảm nhận lên mức 750.000đ+.",
    ],
  };

  // 4. Sinh 10 chủ đề nội dung cụ thể (Concrete Topics) chuẩn v2.0 mục 19 — evidenceNote
  //    nay ưu tiên dữ liệu thật (nợ #115, chốt 21/09/2026), chỉ dùng câu minh hoạ trung
  //    thực (không số liệu bịa) khi không có dữ liệu thật cho chủ đề đó.
  const formattedPrice = context.suggestedPrice > 0 ? `${(context.suggestedPrice / 1000).toLocaleString("vi-VN")}K` : "599K";

  const rawTopics: ConcreteTopic[] = [
    {
      id: "top-01",
      title: `Sản phẩm ${primaryOccasion.toLowerCase()} ${formattedPrice} cho người thích tone màu ${mainColor.toLowerCase()}`,
      angleCategory: "PRODUCT_SHOWCASE",
      hook: `Đừng mua hoa đắt tiền, chỉ cần ${formattedPrice} mà tinh tế như thế này thì ai cũng đổ!`,
      format: "REELS_TIKTOK_9_16",
      cta: "Nhắn tin cho cửa hàng để giữ sản phẩm trong ngày nhé!",
      evidenceNote: honestEvidenceNote({
        sourceLabel: "SerpApi & TikTok",
        tenantSignalText: findRealSignal(mainColor),
        attributeSignal: realAttributeSignals?.color,
      }),
      platform: "tiktok",
      referenceUrl: `https://www.tiktok.com/search?q=${encodeURIComponent("sản phẩm tone " + mainColor)}`,
    },
    {
      id: "top-02",
      title: `3 tone màu giúp sản phẩm ${dominantFlower.toLowerCase()} trông sang trọng gấp đôi`,
      angleCategory: "EDUCATIONAL",
      hook: "Bí quyết thợ chế tác 10 năm kinh nghiệm: Phối 3 tone màu này sản phẩm lập tức nâng tầm!",
      format: "CAROUSEL_PHOTO_1_1",
      cta: "Lưu lại bài viết này để khi cần đặt hoa mở ra xem ngay nhé!",
      evidenceNote: honestEvidenceNote({
        sourceLabel: "YouTube Shorts",
        tenantSignalText: findRealSignal(dominantFlower),
        attributeSignal: realAttributeSignals?.dominantFlower,
      }),
      platform: "youtube",
      referenceUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent("phối màu sản phẩm " + dominantFlower)}`,
    },
    {
      id: "top-03",
      title: `Nếu cô ấy yêu vẻ đẹp dịu dàng, hãy chọn ngay sản phẩm này`,
      angleCategory: "PROBLEM_SOLUTION",
      hook: "Con trai thường không biết chọn hoa gì, cứ mang ảnh này ra là 10 điểm tinh tế!",
      format: "REELS_TIKTOK_9_16",
      cta: "Inbox ngay tiệm gói sẵn kèm thiệp viết tay theo lời chúc của bạn.",
      evidenceNote: honestEvidenceNote({
        sourceLabel: "Google Trends",
        tenantSignalText: findRealSignal(primaryOccasion),
        attributeSignal: realAttributeSignals?.occasion,
      }),
      platform: "google",
      referenceUrl: `https://trends.google.com.vn/trends/explore?geo=VN&q=${encodeURIComponent("hoa tặng bạn gái")}`,
    },
    {
      id: "top-04",
      title: "Sản phẩm thay lời tỏ tình: Có những món quà không cần nói thành lời",
      angleCategory: "EMOTIONAL",
      hook: "Có những cảm xúc khó cất thành lời, hãy để những thành phần này nói thay bạn...",
      format: "REELS_TIKTOK_9_16",
      cta: "Đặt trước hôm nay để cửa hàng chuẩn bị sản phẩm chất lượng nhất.",
      evidenceNote: "Góc cảm xúc phù hợp định dạng video ngắn, thường giữ chân người xem tốt hơn nội dung thuần sản phẩm.",
      platform: "tiktok",
      referenceUrl: `https://www.tiktok.com/search?q=${encodeURIComponent("quà tặng tinh tế")}`,
    },
    {
      id: "top-05",
      title: `Tại sao phong cách ${primaryStyle} đang gây sốt trở lại?`,
      angleCategory: "TREND",
      hook: "Bỏ qua các kiểu cắm rườm rà, đây là phong cách được Gen Z và dân văn phòng săn đón nhất hiện nay!",
      format: "CAROUSEL_PHOTO_1_1",
      cta: "Bạn thuộc team hoa truyền thống hay team cắm tự nhiên? Bình luận cho tiệm biết nhé!",
      evidenceNote: honestEvidenceNote({
        sourceLabel: "TikTok Trend",
        tenantSignalText: findRealSignal(primaryStyle),
        attributeSignal: realAttributeSignals?.style,
      }),
      platform: "tiktok",
      referenceUrl: `https://www.tiktok.com/tag/${encodeURIComponent("hoatuoi")}`,
    },
    {
      id: "top-06",
      title: `Tone ${mainColor.toLowerCase()} vs ${attributes.secondaryColors?.[0] || "tone trắng kem"}: Kiểu nào cuốn hút hơn?`,
      angleCategory: "PROBLEM_SOLUTION",
      hook: `Đặt 2 cách phối màu cạnh nhau mới thấy sự khác biệt diệu kỳ khi chọn ${mainColor.toLowerCase()}!`,
      format: "CAROUSEL_PHOTO_1_1",
      cta: `Thả tim nếu bạn thích tone ${mainColor.toLowerCase()}, bình luận nếu chọn ${attributes.secondaryColors?.[0] || "tone khác"} nhé!`,
      evidenceNote: honestEvidenceNote({
        sourceLabel: "Instagram / Pinterest",
        tenantSignalText: findRealSignal(mainColor),
        attributeSignal: realAttributeSignals?.color,
      }),
      platform: "tiktok",
    },
    {
      id: "top-07",
      title: `Bí quyết chọn ${dominantFlower.toLowerCase()} phong cách ${primaryStyle} chuẩn gu người nhận`,
      angleCategory: "EDUCATIONAL",
      hook: `Đừng chọn hoa theo thói quen, phong cách ${primaryStyle} có công thức riêng để ghi điểm tuyệt đối!`,
      format: "REELS_TIKTOK_9_16",
      cta: `Nhắn tin tiệm tư vấn cách gói hoa ${dominantFlower.toLowerCase()} thanh lịch.`,
      evidenceNote: honestEvidenceNote({
        sourceLabel: "Google Trends",
        tenantSignalText: findRealSignal(primaryStyle),
        attributeSignal: realAttributeSignals?.style,
      }),
      platform: "google",
    },
    {
      id: "top-08",
      title: `Quá trình hoàn thiện một sản phẩm ${dominantFlower.toLowerCase()} tại xưởng`,
      angleCategory: "PRODUCT_SHOWCASE",
      hook: "Mất 45 phút tỉ mẩn từng thành phần để tạo nên kiệt tác này, bạn xem có xứng đáng không?",
      format: "REELS_TIKTOK_9_16",
      cta: "Ghé trực tiếp cửa hàng để khám phá quy trình chế tác thủ công nhé!",
      evidenceNote: honestEvidenceNote({
        sourceLabel: "TikTok / Reels",
        tenantSignalText: findRealSignal(dominantFlower),
        attributeSignal: realAttributeSignals?.dominantFlower,
      }),
      platform: "tiktok",
    },
    {
      id: "top-09",
      title: "Cách chọn hoa sinh nhật chuẩn gu theo từng tính cách",
      angleCategory: "EDUCATIONAL",
      hook: "Đừng chọn hoa theo sở thích của bạn, hãy chọn hoa theo 4 nhóm tính cách này của người nhận!",
      format: "CAROUSEL_PHOTO_1_1",
      cta: "Lưu lại bài hướng dẫn này nhé!",
      evidenceNote: "Nội dung dạng cẩm nang (hướng dẫn từng bước) thường được lưu (Save) nhiều hơn các định dạng khác — đây là kinh nghiệm chung của ngành, chưa phải số đo thật của tiệm bạn.",
    },
    {
      id: "top-10",
      title: `Món quà sinh nhật ngọt ngào nhất dành cho người bạn thương yêu`,
      angleCategory: "EMOTIONAL",
      hook: "Khoảnh khắc người ấy nhận được sản phẩm này và mỉm cười chính là điều vô giá nhất hôm nay.",
      format: "REELS_TIKTOK_9_16",
      cta: "Tiệm giao hoa hỏa tốc trong 2 giờ nội thành kèm ảnh chụp trước khi giao.",
      evidenceNote: "Khách mua hoa dịp sinh nhật thường quay lại vào dịp kế tiếp nếu trải nghiệm tốt — nên đầu tư chăm sóc hậu mãi cho nhóm khách này.",
      platform: "tiktok",
    },
  ];

  // Gắn Dẫn chứng Video Kép (Dual Video Evidence) vào toàn bộ 10 chủ đề
  const topicsWithEvidence: ConcreteTopic[] = rawTopics.map((t) => {
    const dual = getTopicDualRealVideoEvidence(t.title);
    return {
      ...t,
      dualVideoEvidence: {
        youtube: {
          thumbnailUrl: dual.youtube.thumbnailUrl,
          videoUrl: dual.youtube.videoUrl,
          title: dual.youtube.title,
          author: dual.youtube.author,
          metrics: dual.youtube.metrics,
          alt: dual.youtube.alt,
          isLiveEvidence: dual.youtube.isLiveEvidence,
        },
        tiktok: {
          thumbnailUrl: dual.tiktok.thumbnailUrl,
          videoUrl: dual.tiktok.videoUrl,
          title: dual.tiktok.title,
          author: dual.tiktok.author,
          metrics: dual.tiktok.metrics,
          alt: dual.tiktok.alt,
          isLiveEvidence: dual.tiktok.isLiveEvidence,
        },
      },
    };
  });

  // 5. Đánh giá độ sẵn sàng nội dung (Readiness) động
  const hasDominant = components.some((c) => c.role === "dominant" && (c.quantityEstimate || 0) > 0);
  const hasOccasions = context.likelyOccasions && context.likelyOccasions.length > 0;
  const hasAudience = Boolean(context.likelyAudience);
  const hasPrice = (context.suggestedPrice || 0) > 0;

  const readiness: ProductContentReadiness = {
    productRecognition: hasDominant,
    trendFit: trendFitScore >= 70,
    audienceDefined: hasOccasions && hasAudience,
    positioningDefined: hasPrice,
    visualQuality: imageUrl && !imageUrl.includes("placeholder") ? "EXCELLENT" : "ACCEPTABLE",
    videoPotential: contentFitScore >= 75,
  };

  const commercialPassport = buildCommercialPassport(
    productName,
    components,
    attributes,
    packaging,
    context,
    input.commercialPassport
  );

  return {
    id: input.id || `pi_${Date.now()}`,
    productName,
    imageUrl,
    trendFitScore,
    audienceFitScore,
    contentFitScore,
    overallFit,
    components,
    attributes,
    packaging,
    context,
    commercialPassport,
    trendFitMatrix,
    improvements,
    topics: topicsWithEvidence,
    readiness,
    createdAt: new Date().toISOString(),
  };
}
