/**
 * Credit Estimator — Ước tính chi phí credit cho từng feature.
 * 
 * D14 (bảng giá credit) CHƯA CHỐT — dùng giá placeholder dựa trên:
 * - Chi phí GPU/token thực tế của các provider
 * - Độ phức tạp tính toán
 * - Benchmark từ M04a (media.optimize = 15 credits cho 1 Master + 4 ratios)
 * 
 * Khi D14 chốt: thay bằng bảng cấu hình trong DB hoặc config file.
 */

export interface CreditEstimate {
  featureKey: string;
  featureLabel: string;
  estimatedCredits: number;
  breakdown?: string;
  confidence: "low" | "medium" | "high";
}

/**
 * Credit estimates per feature (D14 placeholder values)
 * 
 * Logic định giá:
 * - Vision analysis (M01): 10 credits — 1 lượt gọi provider có cấu trúc
 * - Product copy (M01b): 5-8 credits — text generation ngắn
 * - Media optimize (M04a): 15 credits — enhance + guard + 4 ratios
 * - Creative (M04b): 1-5 credits/variant — tùy generative vs deterministic
 * - Video (M04c): 15-40 credits — video generation đắt hơn ảnh 10-20x
 * - Content (M07): 1-4 credits — text generation
 * - Catalog/Landing: 5-10 credits — orchestration + generation
 * - CRM: 1-5 credits — segmentation/reminder
 */
export const CREDIT_ESTIMATES: Record<string, CreditEstimate> = {
  // M01 - Vision Analysis (auto-run, all capabilities together)
  "vision.analyze": {
    featureKey: "vision.analyze",
    featureLabel: "Phân tích ảnh sản phẩm (M01)",
    estimatedCredits: 10,
    breakdown: "AIC-01..06 trong 1 lượt gọi provider có cấu trúc",
    confidence: "high",
  },

  // M01b - Product Sales Data
  "vision.suggest_name": {
    featureKey: "vision.suggest_name",
    featureLabel: "Đề xuất tên sản phẩm",
    estimatedCredits: 2,
    breakdown: "Short text generation (~100 tokens)",
    confidence: "medium",
  },
  "vision.suggest_description": {
    featureKey: "vision.suggest_description",
    featureLabel: "Đề xuất mô tả sản phẩm",
    estimatedCredits: 3,
    breakdown: "Marketing copy ~300 tokens",
    confidence: "medium",
  },
  "vision.suggest_tags_occasions": {
    featureKey: "vision.suggest_tags_occasions",
    featureLabel: "Đề xuất thẻ & dịp phù hợp",
    estimatedCredits: 1,
    breakdown: "Short structured output",
    confidence: "high",
  },
  "vision.suggest_price_segment": {
    featureKey: "vision.suggest_price_segment",
    featureLabel: "Đề xuất phân khúc giá",
    estimatedCredits: 1,
    breakdown: "Classification task, few tokens",
    confidence: "high",
  },

  // M04a - Master Image Optimization (auto-run)
  "media.optimize": {
    featureKey: "media.optimize",
    featureLabel: "Master Image Optimization (M04a)",
    estimatedCredits: 15,
    breakdown: "Enhance (Real-ESRGAN) + Identity Guard (2x vision) + Smart Reframe 4 ratios",
    confidence: "high",
  },

  // M04b - Creative Variants
  "creative.background_removal": {
    featureKey: "creative.background_removal",
    featureLabel: "Xóa nền (Background Removal)",
    estimatedCredits: 3,
    breakdown: "rembg (U2-Net) local + PIL fallback — low GPU",
    confidence: "high",
  },
  "creative.background_replacement": {
    featureKey: "creative.background_replacement",
    featureLabel: "Đổi nền (Background Replacement)",
    estimatedCredits: 5,
    breakdown: "Generative background (SDXL/Flux) + composite",
    confidence: "medium",
  },
  "creative.outpainting": {
    featureKey: "creative.outpainting",
    featureLabel: "Mở rộng khung (Generative Fill)",
    estimatedCredits: 4,
    breakdown: "Outpainting 1-2 edges, product integrity check",
    confidence: "medium",
  },
  "creative.retouch_deterministic": {
    featureKey: "creative.retouch_deterministic",
    featureLabel: "Retouch cơ bản (Sáng/Màu/Độ tương phản)",
    estimatedCredits: 1,
    breakdown: "PIL/OpenCV deterministic ops — no GPU",
    confidence: "high",
  },
  "creative.retouch_generative": {
    featureKey: "creative.retouch_generative",
    featureLabel: "Retouch AI (Generative)",
    estimatedCredits: 4,
    breakdown: "Inpainting/retouch model + guard check",
    confidence: "medium",
  },
  "creative.watermark": {
    featureKey: "creative.watermark",
    featureLabel: "Watermark logo cửa hàng",
    estimatedCredits: 1,
    breakdown: "Deterministic overlay — negligible compute",
    confidence: "high",
  },
  "creative.channel_variants": {
    featureKey: "creative.channel_variants",
    featureLabel: "Biến thể theo kênh (per variant)",
    estimatedCredits: 2,
    breakdown: "Composition deterministic, per variant output",
    confidence: "high",
  },

  // M04c - Video Studio
  "video.reel_15s": {
    featureKey: "video.reel_15s",
    featureLabel: "Reel 15s (FB/IG)",
    estimatedCredits: 25,
    breakdown: "Storyboard + 5-8 shot gen + assembly + audio + TTS",
    confidence: "low", // depends on video provider pricing
  },
  "video.tiktok_30s": {
    featureKey: "video.tiktok_30s",
    featureLabel: "TikTok 30s",
    estimatedCredits: 35,
    breakdown: "Longer duration, trend-aware, more shots",
    confidence: "low",
  },
  "video.story_15s": {
    featureKey: "video.story_15s",
    featureLabel: "Story 15s (Khuyến mãi)",
    estimatedCredits: 20,
    breakdown: "Vertical 9:16, sticker overlay, countdown",
    confidence: "low",
  },
  "video.slideshow": {
    featureKey: "video.slideshow",
    featureLabel: "Slideshow Catalog",
    estimatedCredits: 15,
    breakdown: "Ken Burns transitions, music sync, lower compute",
    confidence: "medium",
  },
  "video.product_page": {
    featureKey: "video.product_page",
    featureLabel: "Video Landing Page",
    estimatedCredits: 30,
    breakdown: "Voiceover + spec overlay + longer duration",
    confidence: "low",
  },
  "video.ad_motion": {
    featureKey: "video.ad_motion",
    featureLabel: "Motion Quảng cáo (Ads)",
    estimatedCredits: 40,
    breakdown: "High quality, brand-safe, multiple aspect ratios",
    confidence: "low",
  },

  // M07 - Content Engine
  "content.facebook_post": {
    featureKey: "content.facebook_post",
    featureLabel: "Facebook Post",
    estimatedCredits: 2,
    breakdown: "~500 tokens, brand voice + hashtags + CTA",
    confidence: "medium",
  },
  "content.instagram_caption": {
    featureKey: "content.instagram_caption",
    featureLabel: "Instagram Caption + Hashtag",
    estimatedCredits: 2,
    breakdown: "~400 tokens + 20 hashtags research",
    confidence: "medium",
  },
  "content.tiktok_script": {
    featureKey: "content.tiktok_script",
    featureLabel: "TikTok Script",
    estimatedCredits: 3,
    breakdown: "Structured script ~800 tokens + timing + music cues",
    confidence: "medium",
  },
  "content.zalo_oa": {
    featureKey: "content.zalo_oa",
    featureLabel: "Zalo OA Message",
    estimatedCredits: 2,
    breakdown: "Template-aware, SENSITIVE data handling",
    confidence: "medium",
  },
  "content.headlines": {
    featureKey: "content.headlines",
    featureLabel: "Tiêu đề hấp dẫn",
    estimatedCredits: 1,
    breakdown: "10 options, ~50 tokens each",
    confidence: "high",
  },
  "content.seo_description": {
    featureKey: "content.seo_description",
    featureLabel: "Mô tả SEO",
    estimatedCredits: 1,
    breakdown: "Meta + alt + structured data, ~200 tokens",
    confidence: "high",
  },
  "content.hashtags": {
    featureKey: "content.hashtags",
    featureLabel: "Hashtag gợi ý",
    estimatedCredits: 1,
    breakdown: "Research + ranking, ~100 tokens",
    confidence: "high",
  },
  "content.ad_copy": {
    featureKey: "content.ad_copy",
    featureLabel: "Nội dung quảng cáo (Ad Copy)",
    estimatedCredits: 3,
    breakdown: "Primary + headline + desc for FB/TikTok Ads",
    confidence: "medium",
  },
  "content.livestream_script": {
    featureKey: "content.livestream_script",
    featureLabel: "Kịch bản Livestream",
    estimatedCredits: 4,
    breakdown: "Outline 30-60p, ~2000 tokens structured",
    confidence: "medium",
  },
  "content.sales_message": {
    featureKey: "content.sales_message",
    featureLabel: "Tin nhắn bán hàng (DM/Chat)",
    estimatedCredits: 2,
    breakdown: "Template replies with product/price injection",
    confidence: "high",
  },

  // M09 - CRM
  "customer.segmentation": {
    featureKey: "customer.segmentation",
    featureLabel: "Phân nhóm khách hàng (AI)",
    estimatedCredits: 5,
    breakdown: "Clustering on transaction history, SENSITIVE",
    confidence: "low",
  },
  "customer.reminder_message": {
    featureKey: "customer.reminder_message",
    featureLabel: "Tin nhắn nhắc mua lại (AI)",
    estimatedCredits: 1,
    breakdown: "Per message, consent-gated, approval needed",
    confidence: "high",
  },

  // M06 - Catalog
  "catalog.generate": {
    featureKey: "catalog.generate",
    featureLabel: "Tạo Catalog số + QR",
    estimatedCredits: 5,
    breakdown: "Layout + product data + QR generation",
    confidence: "high",
  },

  // M05 - Landing Page
  "landing.generate": {
    featureKey: "landing.generate",
    featureLabel: "Tạo Landing Page chiến dịch",
    estimatedCredits: 10,
    breakdown: "AI plan + template selection + content fill + deploy",
    confidence: "medium",
  },
};

/**
 * Tính tổng credit ước tính cho danh sách features đã chọn
 */
export function estimateTotalCredits(selectedFeatureKeys: string[]): number {
  return selectedFeatureKeys.reduce((sum, key) => {
    const estimate = CREDIT_ESTIMATES[key];
    return sum + (estimate?.estimatedCredits ?? 0);
  }, 0);
}

/**
 * Lấy chi tiết ước tính cho từng feature
 */
export function getCreditBreakdown(selectedFeatureKeys: string[]): CreditEstimate[] {
  return selectedFeatureKeys
    .map(key => CREDIT_ESTIMATES[key])
    .filter((e): e is CreditEstimate => Boolean(e))
    .sort((a, b) => b.estimatedCredits - a.estimatedCredits);
}

/**
 * Kiểm tra xem user có đủ credit không
 */
export function canAfford(
  userCreditBalance: number,
  selectedFeatureKeys: string[],
  bufferPercent = 0.1
): { canAfford: boolean; totalCost: number; requiredBalance: number } {
  const totalCost = estimateTotalCredits(selectedFeatureKeys);
  const requiredBalance = Math.ceil(totalCost * (1 + bufferPercent));
  return {
    canAfford: userCreditBalance >= requiredBalance,
    totalCost,
    requiredBalance,
  };
}

/**
 * Format credit display
 */
export function formatCredits(credits: number): string {
  return `${credits} credit${credits !== 1 ? "s" : ""}`;
}

/**
 * Get warning level based on cost vs balance
 */
export function getCostWarningLevel(
  userCreditBalance: number,
  selectedFeatureKeys: string[]
): "safe" | "warning" | "danger" {
  const { totalCost, requiredBalance } = canAfford(userCreditBalance, selectedFeatureKeys);
  if (userCreditBalance < totalCost) return "danger";
  if (userCreditBalance < requiredBalance) return "warning";
  return "safe";
}