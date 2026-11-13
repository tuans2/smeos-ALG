/**
 * Domain rules cho Product Copies (M01b) — dữ liệu bán hàng sinh từ phân tích đã duyệt.
 * 
 * Luật:
 * - `raw` là dự đoán gốc của máy (AIC-07, AIC-08, AIC-09, AIC-10), bất biến
 * - `edited` là bản người sửa trước khi duyệt, lưu tách biệt
 * - Chỉ duyệt (`H6`) khi có `analysis_id` trỏ tới `product_analyses` đã `APPROVED`
 * - Duyệt ghi Product Master + `audit_logs` trong một giao dịch
 * - Phân khúc giá là nhãn bán hàng, không ghi vào `orders` hay `pricing_rules`
 */

export type TargetAudience = {
  recipient: string;
  buyer_persona: string;
};

export type CardMessageSuggestions = {
  romantic: string;
  subtle: string;
  congratulatory: string;
};

export type SuggestedPriceRange = {
  min_price: number;
  target_price: number;
  max_price: number;
};

export type ProductCopyRaw = {
  /** Tên gợi ý: "Bó hồng đỏ 20 cành - Valentine" */
  suggested_name: string;
  /** Slogan / Catchphrase ngắn 1 dòng (dưới 60 ký tự) cho Banner / Story / Thumbnail */
  short_headline?: string | undefined;
  /** Mô tả marketing giàu cảm xúc: "Sản phẩm hồng đỏ tinh tế, 20 cành, ý nghĩa tình yêu..." */
  suggested_description: string;
  /** Phong cách thiết kế: "Sang trọng" | "Hàn Quốc Romantic" | "Tối giản" ... */
  suggested_style: string;
  /** Thẻ gợi ý mạng xã hội: ["hồng-đỏ", "valentine", "tang-nguoi-yeu"] */
  suggested_tags: string[];
  /** Từ khóa tìm kiếm Search Intent Google / SEO */
  seo_keywords?: string[] | undefined;
  /** Dịp gợi ý chính (mã từ bảng `occasions`): ["valentine", "anniversary"] */
  suggested_occasions: string[];
  /** Dịp gợi ý phụ mở rộng bán chéo */
  secondary_occasions?: string[] | undefined;
  /** Đối tượng khách hàng mục tiêu: Người nhận & Người mua */
  target_audience?: TargetAudience | undefined;
  /** Ý nghĩa câu chuyện loài hoa (Storytelling bán hàng) */
  flower_meaning_story?: string | undefined;
  /** 3-4 điểm bán hàng nổi bật (USP) để sale/bot chốt đơn nhanh */
  key_selling_points?: string[] | undefined;
  /** 3 mẫu lời chúc viết thiệp tương ứng các sắc thái */
  card_message_suggestions?: CardMessageSuggestions | undefined;
  /** 2-3 mẹo chăm sóc giữ sản phẩm bền lâu */
  care_instructions?: string[] | undefined;
  /** Phân khúc giá: "budget" | "standard" | "premium" | "luxury" */
  suggested_price_segment: "budget" | "standard" | "premium" | "luxury";
  /** Dải giá bán đề xuất để cân đối biên lợi nhuận */
  suggested_price_range?: SuggestedPriceRange | undefined;
  /** Gợi ý sản phẩm mua kèm gia tăng AOV (bình gốm, thiệp sáp, socola...) */
  recommended_upsells?: string[] | undefined;
};

export type ProductCopyEdited = Partial<ProductCopyRaw>;

export type ProductCopyEffective = ProductCopyRaw & ProductCopyEdited;

/**
 * Kiểm tra xem product_copy có thể duyệt không
 * - Phải có analysis_id hợp lệ
 * - product_analyses tương ứng phải đã APPROVED
 */
export function canApproveProductCopy(
  analysisApprovalState: "PENDING" | "APPROVED" | "REJECTED"
): boolean {
  return analysisApprovalState === "APPROVED";
}

/**
 * Lấy dữ liệu hiệu lực: edited ưu tiên, fallback raw
 */
export function resolveEffectiveProductCopy(
  raw: ProductCopyRaw,
  edited: ProductCopyEdited | null
): ProductCopyEffective {
  if (!edited) return raw;
  return {
    ...raw,
    ...edited,
    suggested_tags: edited.suggested_tags ?? raw.suggested_tags,
    suggested_occasions: edited.suggested_occasions ?? raw.suggested_occasions,
    suggested_style: edited.suggested_style ?? raw.suggested_style,
    short_headline: edited.short_headline ?? raw.short_headline,
    seo_keywords: edited.seo_keywords ?? raw.seo_keywords,
    secondary_occasions: edited.secondary_occasions ?? raw.secondary_occasions,
    target_audience: edited.target_audience ?? raw.target_audience,
    flower_meaning_story: edited.flower_meaning_story ?? raw.flower_meaning_story,
    key_selling_points: edited.key_selling_points ?? raw.key_selling_points,
    card_message_suggestions: edited.card_message_suggestions ?? raw.card_message_suggestions,
    care_instructions: edited.care_instructions ?? raw.care_instructions,
    suggested_price_range: edited.suggested_price_range ?? raw.suggested_price_range,
    recommended_upsells: edited.recommended_upsells ?? raw.recommended_upsells,
  };
}

/**
 * Validate raw data từ AI — đảm bảo có đủ các trường bắt buộc
 */
export function validateProductCopyRaw(data: unknown): data is ProductCopyRaw {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.suggested_name === "string" && d.suggested_name.length > 0 &&
    typeof d.suggested_description === "string" &&
    Array.isArray(d.suggested_tags) &&
    Array.isArray(d.suggested_occasions) &&
    ["budget", "standard", "premium", "luxury"].includes(d.suggested_price_segment as string)
  );
}

/**
 * Validate edited data — chỉ cho phép các trường đã định nghĩa
 */
export function validateProductCopyEdited(data: unknown): data is ProductCopyEdited {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  const allowedKeys = [
    "suggested_name",
    "short_headline",
    "suggested_description",
    "suggested_style",
    "suggested_tags",
    "seo_keywords",
    "suggested_occasions",
    "secondary_occasions",
    "target_audience",
    "flower_meaning_story",
    "key_selling_points",
    "card_message_suggestions",
    "care_instructions",
    "suggested_price_segment",
    "suggested_price_range",
    "recommended_upsells",
  ];
  return Object.keys(d).every(k => allowedKeys.includes(k));
}

/**
 * Schema cho payload tạo product_copy từ AI gateway
 * AI gateway trả về structured output theo AIC-07..10
 */
export const PRODUCT_COPY_AI_SCHEMA = {
  type: "object",
  properties: {
    suggested_name: { type: "string", minLength: 1, maxLength: 200 },
    short_headline: { type: "string", maxLength: 100 },
    suggested_description: { type: "string", minLength: 1, maxLength: 2000 },
    suggested_style: { type: "string" },
    suggested_tags: { type: "array", items: { type: "string" }, maxItems: 20 },
    seo_keywords: { type: "array", items: { type: "string" }, maxItems: 10 },
    suggested_occasions: { type: "array", items: { type: "string" }, maxItems: 10 },
    secondary_occasions: { type: "array", items: { type: "string" }, maxItems: 10 },
    target_audience: {
      type: "object",
      properties: {
        recipient: { type: "string" },
        buyer_persona: { type: "string" },
      },
      required: ["recipient", "buyer_persona"],
    },
    flower_meaning_story: { type: "string" },
    key_selling_points: { type: "array", items: { type: "string" }, maxItems: 5 },
    card_message_suggestions: {
      type: "object",
      properties: {
        romantic: { type: "string" },
        subtle: { type: "string" },
        congratulatory: { type: "string" },
      },
      required: ["romantic", "subtle", "congratulatory"],
    },
    care_instructions: { type: "array", items: { type: "string" }, maxItems: 5 },
    suggested_price_segment: { 
      type: "string", 
      enum: ["budget", "standard", "premium", "luxury"] 
    },
    suggested_price_range: {
      type: "object",
      properties: {
        min_price: { type: "number" },
        target_price: { type: "number" },
        max_price: { type: "number" },
      },
      required: ["min_price", "target_price", "max_price"],
    },
    recommended_upsells: { type: "array", items: { type: "string" }, maxItems: 5 },
  },
  required: [
    "suggested_name",
    "suggested_description",
    "suggested_tags",
    "suggested_occasions",
    "suggested_price_segment",
  ],
  additionalProperties: true,
} as const;