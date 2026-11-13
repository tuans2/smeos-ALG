"use client";

/**
 * Feature Catalog — mapping 34 AI Capabilities (AIC-01 → AIC-34) to UI selectable features.
 * 
 * Mỗi SubFeature = một nút bấm/checkbox trên dashboard.
 * Backend nhận mảng `selectedFeatures` (keys) → nhóm theo module → tạo job per module.
 * 
 * Nguồn thật: `src/core/ai/domain/ai-capabilities.ts` + `src/core/rbac/capability-catalog.ts`
 */

export type AiPrivacyLevel = "PUBLIC" | "SHOP" | "SENSITIVE";
export type ModuleKey = "M01" | "M01b" | "M04a" | "M04b" | "M04c" | "M07" | "M09" | "M06" | "M05" | "M03" | "M08" | "M11";
export type FeatureStatus = "available" | "beta" | "coming_soon";

export interface SubFeature {
  /** Key duy nhất dùng trong FE/BE — ví dụ: "vision.identify_flowers" */
  key: string;
  /** Nhãn hiển thị cho user */
  label: string;
  /** Mô tả ngắn gọn */
  description: string;
  /** Mã AI Capability (AIC-xx) */
  aiCapability: string;
  /** RBAC capability để CHẠY tính năng này */
  rbacRun: string;
  /** RBAC capability để DUYỆT kết quả (rỗng nếu không cần duyệt) */
  rbacApprove: string;
  /** Module cha */
  module: ModuleKey;
  /** Trạng thái triển khai */
  status: FeatureStatus;
  /** Cần kết quả đã duyệt của feature khác trước (ví dụ M01b cần M01 approved) */
  requiresApprovedInput?: string;
  /** Cần Master Image đã APPROVED (M04b, M04c, M07) */
  dependsOnMasterImage?: boolean;
  /** Gửi tới khách (M09 nhắc mua lại): chỉ khách đã đồng ý nhận tin — kiểm theo từng khách lúc gửi, không khoá ở đây */
  requiresConsent?: boolean;
  /** Ước tính credit (D14 placeholder — chưa chốt bảng giá) */
  creditCost?: number;
  /** Sàn quyền riêng tư của năng lực này */
  privacyFloor: AiPrivacyLevel;
  /** Cần duyệt trước khi thành dữ liệu chính thức */
  needsApproval: boolean;
  /** Ẩn khỏi UI picker (dùng ngầm như M03 search) */
  hidden?: boolean;
  /** Nhóm con trong module (để render accordion) */
  group?: string;
}

export interface ModuleFeatureGroup {
  module: ModuleKey;
  label: string;
  description: string;
  icon: string; // lucide icon name
  features: SubFeature[];
  /** Module này có chạy tự động không (M01, M04a chạy gộp, không tick riêng) */
  isAutoRun?: boolean;
  /** Cần Master Image approved trước khi module này chạy được */
  requiresMasterImage?: boolean;
}

/**
 * DANH SÁCH ĐẦY ĐỦ 34 AI CAPABILITIES MAP VỀ SUB-FEATURES
 * 
 * Lưu ý: M01 và M04a là "auto-run" — user không tick từng AIC,
 * mà bấm 1 nút "Phân tích ảnh" / "Tạo Master Image" chạy hết AIC trong module.
 */
export const FEATURE_CATALOG: SubFeature[] = [
  // ============================================================
  // M01 — PHÂN TÍCH SẢN PHẨM (Vision Engine) — AUTO RUN
  // ============================================================
  {
    key: "vision.identify_flowers",
    label: "Nhận diện nguyên liệu & giống",
    description: "Phân loại 86 loài hoa, trả species/variety/count/confidence/bbox",
    aiCapability: "AIC-01",
    rbacRun: "H1",
    rbacApprove: "H3",
    module: "M01",
    status: "available",
    privacyFloor: "SHOP",
    needsApproval: true,
    group: "analyze",
    hidden: true, // không tick riêng, chạy gộp
  },
  {
    key: "vision.count_stems",
    label: "Đếm số lượng cành/nụ/hỏng",
    description: "3 tổng: flower_count, bud_count, damaged_count theo QUY_UOC_DEM.md",
    aiCapability: "AIC-02",
    rbacRun: "H1",
    rbacApprove: "H3",
    module: "M01",
    status: "available",
    privacyFloor: "SHOP",
    needsApproval: true,
    group: "analyze",
    hidden: true,
  },
  {
    key: "vision.detect_foliage_accessories",
    label: "Phát hiện lá, phụ kiện",
    description: "foliage[], accessories[] — loại, số lượng, vị trí",
    aiCapability: "AIC-03",
    rbacRun: "H1",
    rbacApprove: "H3",
    module: "M01",
    status: "available",
    privacyFloor: "SHOP",
    needsApproval: true,
    group: "analyze",
    hidden: true,
  },
  {
    key: "vision.detect_wrapping",
    label: "Nhận diện gói, nơ, bao bì",
    description: "wrapping.material, wrapping.color, ribbon.style, packaging[]",
    aiCapability: "AIC-04",
    rbacRun: "H1",
    rbacApprove: "H3",
    module: "M01",
    status: "available",
    privacyFloor: "SHOP",
    needsApproval: true,
    group: "analyze",
    hidden: true,
  },
  {
    key: "vision.analyze_colors",
    label: "Phân tích màu sắc & tone",
    description: "dominant_colors[] (HEX + % diện tích), color_harmony, tone_label",
    aiCapability: "AIC-05",
    rbacRun: "H1",
    rbacApprove: "H3",
    module: "M01",
    status: "available",
    privacyFloor: "SHOP",
    needsApproval: true,
    group: "analyze",
    hidden: true,
  },
  {
    key: "vision.classify_style",
    label: "Nhận diện phong cách thiết kế",
    description: "style: hand_tied/vase/box/basket/standing/wreath + confidence",
    aiCapability: "AIC-06",
    rbacRun: "H1",
    rbacApprove: "H3",
    module: "M01",
    status: "available",
    privacyFloor: "SHOP",
    needsApproval: true,
    group: "analyze",
    hidden: true,
  },

  // ============================================================
  // M01b — DỮ LIỆU BÁN HÀNG (Product Sales Data) — TICK RIÊNG
  // Chỉ hiện SAU KHI M01 đã APPROVED
  // ============================================================
  {
    key: "vision.suggest_name",
    label: "Đề xuất tên sản phẩm",
    description: "Từ hoa + phong cách + dịp → suggested_name (marketing ready)",
    aiCapability: "AIC-07",
    rbacRun: "H5",
    rbacApprove: "H6",
    module: "M01b",
    status: "available",
    requiresApprovedInput: "vision.analyze",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 2,
    group: "sales_data",
  },
  {
    key: "vision.suggest_description",
    label: "Đề xuất mô tả sản phẩm",
    description: "Marketing copy: cảm xúc, ý nghĩa, từ khóa SEO, độ dài phù hợp",
    aiCapability: "AIC-08",
    rbacRun: "H5",
    rbacApprove: "H6",
    module: "M01b",
    status: "available",
    requiresApprovedInput: "vision.analyze",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 2,
    group: "sales_data",
  },
  {
    key: "vision.suggest_tags_occasions",
    label: "Đề xuất thẻ & dịp phù hợp",
    description: "tags[], occasions[] (map vào bảng occasions nạp sẵn)",
    aiCapability: "AIC-09",
    rbacRun: "H5",
    rbacApprove: "H6",
    module: "M01b",
    status: "available",
    requiresApprovedInput: "vision.analyze",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 1,
    group: "sales_data",
  },
  {
    key: "vision.suggest_price_segment",
    label: "Đề xuất phân khúc giá",
    description: "price_segment: budget/standard/premium/luxury (chỉ nhãn, không ghi giá)",
    aiCapability: "AIC-10",
    rbacRun: "H5",
    rbacApprove: "H6",
    module: "M01b",
    status: "available",
    requiresApprovedInput: "vision.analyze",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 1,
    group: "sales_data",
  },

  // ============================================================
  // M04a — MASTER IMAGE OPTIMIZATION — AUTO RUN
  // Chạy 1 lần: Enhance + Identity Guard + Smart Reframe 4 tỷ lệ
  // ============================================================
  {
    key: "media.enhance",
    label: "Tăng cường ảnh (Real-ESRGAN)",
    description: "Cân bằng trắng, giảm nhiễu, tăng độ nét, giữ nhận dạng sản phẩm",
    aiCapability: "AIC-08",
    rbacRun: "I1",
    rbacApprove: "I2",
    module: "M04a",
    status: "available",
    privacyFloor: "SHOP",
    needsApproval: true,
    hidden: true,
    group: "master_image",
  },
  {
    key: "media.identity_guard",
    label: "Identity Guard (bắt buộc)",
    description: "So vân tay sản phẩm trước/sau — ngưỡng 0.95/0.90, REJECTED giữ ảnh gốc",
    aiCapability: "AIC-10",
    rbacRun: "I1",
    rbacApprove: "I2",
    module: "M04a",
    status: "available",
    privacyFloor: "SHOP",
    needsApproval: false, // guard không duyệt, là cổng cứng
    hidden: true,
    group: "master_image",
  },
  {
    key: "media.smart_reframe",
    label: "Smart Reframe 4 tỷ lệ",
    description: "1:1, 4:5, 9:16, 16:9 từ Master Image MỘT LẦN, không chạy lại AI",
    aiCapability: "AIC-09",
    rbacRun: "I1",
    rbacApprove: "I2",
    module: "M04a",
    status: "available",
    privacyFloor: "SHOP",
    needsApproval: false,
    hidden: true,
    group: "master_image",
  },

  // ============================================================
  // M04b — MARKETING CREATIVE (SocialFlow) — TICK RIÊNG
  // Cần Master Image đã APPROVED
  // ============================================================
  {
    key: "creative.background_removal",
    label: "Xóa nền (Background Removal)",
    description: "rembg (U2-Net) + PIL chroma-key fallback → PNG trong suốt",
    aiCapability: "AIC-11",
    rbacRun: "P1",
    rbacApprove: "P2",
    module: "M04b",
    status: "available",
    dependsOnMasterImage: true,
    privacyFloor: "PUBLIC",
    needsApproval: false, // needsApproval=false trong ai-capabilities.ts
    creditCost: 3,
    group: "creative",
  },
  {
    key: "creative.background_replacement",
    label: "Đổi nền (Studio/Phòng/Khách sạn/Lễ cưới)",
    description: "Thay nền bằng thư viện background có sẵn hoặc custom prompt",
    aiCapability: "AIC-12",
    rbacRun: "P1",
    rbacApprove: "P2",
    module: "M04b",
    status: "coming_soon",
    dependsOnMasterImage: true,
    privacyFloor: "PUBLIC",
    needsApproval: true,
    creditCost: 5,
    group: "creative",
  },
  {
    key: "creative.outpainting",
    label: "Mở rộng khung (Generative Fill)",
    description: "Mở rộng các cạnh ảnh bằng generative AI, giữ sản phẩm nguyên vẹn",
    aiCapability: "AIC-13",
    rbacRun: "P1",
    rbacApprove: "P2",
    module: "M04b",
    status: "coming_soon",
    dependsOnMasterImage: true,
    privacyFloor: "PUBLIC",
    needsApproval: true,
    creditCost: 4,
    group: "creative",
  },
  {
    key: "creative.retouch_deterministic",
    label: "Retouch cơ bản (Sáng/Màu/Độ tương phản)",
    description: "Tăng sáng, chỉnh màu, giảm bóng đen — deterministic, không sinh pixel mới",
    aiCapability: "AIC-14",
    rbacRun: "P1",
    rbacApprove: "P2",
    module: "M04b",
    status: "coming_soon",
    dependsOnMasterImage: true,
    privacyFloor: "PUBLIC",
    needsApproval: false,
    creditCost: 2,
    group: "creative",
  },
  {
    key: "creative.retouch_generative",
    label: "Retouch AI (Generative)",
    description: "AI sửa khuyết điểm, làm mịn, điều chỉnh ánh sáng phức tạp",
    aiCapability: "AIC-15",
    rbacRun: "P1",
    rbacApprove: "P2",
    module: "M04b",
    status: "coming_soon",
    dependsOnMasterImage: true,
    privacyFloor: "PUBLIC",
    needsApproval: true,
    creditCost: 4,
    group: "creative",
  },
  {
    key: "creative.watermark",
    label: "Watermark logo cửa hàng",
    description: "Gắn logo/org branding (cấu hình cấp tổ chức, capability P5/I4)",
    aiCapability: "AIC-16",
    rbacRun: "P1",
    rbacApprove: "P2",
    module: "M04b",
    status: "coming_soon",
    dependsOnMasterImage: true,
    privacyFloor: "PUBLIC",
    needsApproval: false,
    creditCost: 1,
    group: "creative",
  },
  {
    key: "creative.channel_variants",
    label: "Tự tạo biến thể theo kênh (FB/IG/TikTok/Story)",
    description: "Tổ hợp nền + bố cục + khung + chữ chồng + watermark cho từng kênh",
    aiCapability: "AIC-17",
    rbacRun: "P1",
    rbacApprove: "P2",
    module: "M04b",
    status: "coming_soon",
    dependsOnMasterImage: true,
    privacyFloor: "PUBLIC",
    needsApproval: true,
    creditCost: 2, // per variant
    group: "creative",
  },

  // ============================================================
  // M04c — VIDEO STUDIO (SocialFlow) — TICK RIÊNG
  // Cần Master Image đã APPROVED
  // ============================================================
  {
    key: "video.reel_15s",
    label: "Reel 15s (Facebook/Instagram)",
    description: "Chuyển cảnh, zoom, nhạc, subtitle, CTA, logo — hook 3s đầu",
    aiCapability: "AIC-18",
    rbacRun: "P3",
    rbacApprove: "P4",
    module: "M04c",
    status: "coming_soon",
    dependsOnMasterImage: true,
    privacyFloor: "PUBLIC",
    needsApproval: true,
    creditCost: 25,
    group: "video",
  },
  {
    key: "video.tiktok_30s",
    label: "TikTok 30s",
    description: "Theo trend, nhạc hot, text overlay, CTA mạnh, brand end-card",
    aiCapability: "AIC-19",
    rbacRun: "P3",
    rbacApprove: "P4",
    module: "M04c",
    status: "coming_soon",
    dependsOnMasterImage: true,
    privacyFloor: "PUBLIC",
    needsApproval: true,
    creditCost: 35,
    group: "video",
  },
  {
    key: "video.story_15s",
    label: "Story 15s (Khuyến mãi nhanh)",
    description: "Dọc 9:16, countdown sticker, swipe up, urgency messaging",
    aiCapability: "AIC-20",
    rbacRun: "P3",
    rbacApprove: "P4",
    module: "M04c",
    status: "coming_soon",
    dependsOnMasterImage: true,
    privacyFloor: "PUBLIC",
    needsApproval: true,
    creditCost: 20,
    group: "video",
  },
  {
    key: "video.slideshow",
    label: "Slideshow Catalog",
    description: "5-10 slide sản phẩm, chuyển mượt, nhạc nền, logo cuối",
    aiCapability: "AIC-21",
    rbacRun: "P3",
    rbacApprove: "P4",
    module: "M04c",
    status: "coming_soon",
    dependsOnMasterImage: true,
    privacyFloor: "PUBLIC",
    needsApproval: true,
    creditCost: 15,
    group: "video",
  },
  {
    key: "video.product_page",
    label: "Video Landing Page sản phẩm",
    description: "30-60s, voiceover, spec overlay, CTA đặt hàng",
    aiCapability: "AIC-22",
    rbacRun: "P3",
    rbacApprove: "P4",
    module: "M04c",
    status: "coming_soon",
    dependsOnMasterImage: true,
    privacyFloor: "PUBLIC",
    needsApproval: true,
    creditCost: 30,
    group: "video",
  },
  {
    key: "video.ad_motion",
    label: "Motion Quảng cáo (Ads)",
    description: "15-30s, hook mạnh, CTA rõ, brand end-card, tối ưu conversion",
    aiCapability: "AIC-23",
    rbacRun: "P3",
    rbacApprove: "P4",
    module: "M04c",
    status: "coming_soon",
    dependsOnMasterImage: true,
    privacyFloor: "PUBLIC",
    needsApproval: true,
    creditCost: 40,
    group: "video",
  },

  // ============================================================
  // M07 — CONTENT ENGINE (SocialFlow) — TICK RIÊNG
  // Cần Master Image đã APPROVED + Product Master
  // ============================================================
  {
    key: "content.facebook_post",
    label: "Facebook Post",
    description: "Viết theo giọng thương hiệu, kèm hashtag, CTA, gắn sản phẩm",
    aiCapability: "AIC-24",
    rbacRun: "O1",
    rbacApprove: "O3",
    module: "M07",
    status: "coming_soon",
    requiresApprovedInput: "media.optimize",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 2,
    group: "content",
  },
  {
    key: "content.instagram_caption",
    label: "Instagram Caption + Hashtag",
    description: "Caption'engage' + 15-30 hashtag phù hợp niche hoa",
    aiCapability: "AIC-25",
    rbacRun: "O1",
    rbacApprove: "O3",
    module: "M07",
    status: "coming_soon",
    requiresApprovedInput: "media.optimize",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 2,
    group: "content",
  },
  {
    key: "content.tiktok_script",
    label: "TikTok Script (Kịch bản quay)",
    description: "Cấu trúc hook-body-CTA, timing, gợi ý góc quay, nhạc",
    aiCapability: "AIC-26",
    rbacRun: "O1",
    rbacApprove: "O3",
    module: "M07",
    status: "coming_soon",
    requiresApprovedInput: "media.optimize",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 3,
    group: "content",
  },
  {
    key: "content.zalo_oa",
    label: "Zalo OA Message",
    description: "Nội dung chăm sóc khách, template Zalo OA, SENSITIVE data handling",
    aiCapability: "AIC-27",
    rbacRun: "O1",
    rbacApprove: "O3",
    module: "M07",
    status: "coming_soon",
    requiresApprovedInput: "media.optimize",
    privacyFloor: "SENSITIVE", // dữ liệu khách hàng
    needsApproval: true,
    creditCost: 2,
    group: "content",
  },
  {
    key: "content.headlines",
    label: "Tiêu đề hấp dẫn (Headlines)",
    description: "5-10 headline options cho bài viết/quảng cáo",
    aiCapability: "AIC-28",
    rbacRun: "O1",
    rbacApprove: "O3",
    module: "M07",
    status: "coming_soon",
    requiresApprovedInput: "media.optimize",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 1,
    group: "content",
  },
  {
    key: "content.seo_description",
    label: "Mô tả SEO (Meta/Alt text)",
    description: "Meta description, image alt text, structured data snippet",
    aiCapability: "AIC-29",
    rbacRun: "O1",
    rbacApprove: "O3",
    module: "M07",
    status: "coming_soon",
    requiresApprovedInput: "media.optimize",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 1,
    group: "content",
  },
  {
    key: "content.hashtags",
    label: "Hashtag gợi ý",
    description: "Hashtag theo chủ đề, độ phổ biến, niche hoa Việt Nam",
    aiCapability: "AIC-30",
    rbacRun: "O1",
    rbacApprove: "O3",
    module: "M07",
    status: "coming_soon",
    requiresApprovedInput: "media.optimize",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 1,
    group: "content",
  },
  {
    key: "content.ad_copy",
    label: "Nội dung quảng cáo (Ad Copy)",
    description: "Primary text, headline, description cho FB/TikTok Ads",
    aiCapability: "AIC-31",
    rbacRun: "O1",
    rbacApprove: "O3",
    module: "M07",
    status: "coming_soon",
    requiresApprovedInput: "media.optimize",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 3,
    group: "content",
  },
  {
    key: "content.livestream_script",
    label: "Kịch bản Livestream",
    description: "Outline 30-60p: opening, demo sản phẩm, FAQ, closing, CTA",
    aiCapability: "AIC-32",
    rbacRun: "O1",
    rbacApprove: "O3",
    module: "M07",
    status: "coming_soon",
    requiresApprovedInput: "media.optimize",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 4,
    group: "content",
  },
  {
    key: "content.sales_message",
    label: "Tin nhắn bán hàng (DM/Chat)",
    description: "Reply template cho Messenger/Zalo/Web chat, gắn sản phẩm/giá",
    aiCapability: "AIC-33",
    rbacRun: "O1",
    rbacApprove: "O3",
    module: "M07",
    status: "coming_soon",
    requiresApprovedInput: "media.optimize",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 2,
    group: "content",
  },

  // ============================================================
  // M09 — CRM & KHÁCH HÀNG — TICK RIÊNG
  // ============================================================
  {
    key: "customer.segmentation",
    label: "Phân nhóm khách hàng (AI)",
    description: "RFM, lifecycle, preference clustering — SENSITIVE privacy floor",
    aiCapability: "AIC-29",
    rbacRun: "Q3",
    rbacApprove: "",
    module: "M09",
    status: "coming_soon",
    privacyFloor: "SENSITIVE",
    needsApproval: false,
    creditCost: 5,
    group: "crm",
  },
  {
    key: "customer.reminder_message",
    label: "Tin nhắn nhắc mua lại (AI)",
    description: "Tự sinh từ dịp+sản phẩm, cần consent khách, approval Q3",
    aiCapability: "AIC-30",
    rbacRun: "Q3",
    rbacApprove: "Q3",
    module: "M09",
    status: "coming_soon",
    requiresConsent: true,
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 1,
    group: "crm",
  },

  // ============================================================
  // M06 — CATALOG & QR (LocalBudd + Core) — TICK RIÊNG
  // ============================================================
  {
    key: "catalog.generate",
    label: "Tạo Catalog số + QR",
    description: "Filter dịp/màu/loại/bộ sưu tập/giá, slug unique, QR download",
    aiCapability: "AIC-25",
    rbacRun: "J1",
    rbacApprove: "J2",
    module: "M06",
    status: "available", // LocalBudd 6/7 done
    requiresApprovedInput: "media.optimize",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 5,
    group: "catalog",
  },

  // ============================================================
  // M05 — LANDING PAGE (LocalBudd) — TICK RIÊNG
  // ============================================================
  {
    key: "landing.generate",
    label: "Tạo Landing Page chiến dịch",
    description: "Valentine/8/3/Mother's Day/Khai trương/Hoa cưới — AI plan + template",
    aiCapability: "AIC-26",
    rbacRun: "L1",
    rbacApprove: "L2",
    module: "M05",
    status: "coming_soon",
    requiresApprovedInput: "media.optimize",
    privacyFloor: "SHOP",
    needsApproval: true,
    creditCost: 10,
    group: "landing",
  },

  // ============================================================
  // M03 — PRODUCT SEARCH (Core, dùng ngầm, KHÔNG hiển thị picker)
  // ============================================================
  {
    key: "search.product_embedding",
    label: "Embedding sản phẩm (tìm kiếm ngữ nghĩa)",
    description: "Vector embedding cho semantic search — internal use",
    aiCapability: "AIC-27",
    rbacRun: "",
    rbacApprove: "",
    module: "M03",
    status: "available",
    privacyFloor: "SHOP",
    needsApproval: false,
    hidden: true,
  },
  {
    key: "search.semantic",
    label: "Tìm kiếm ngữ nghĩa",
    description: "Tìm sản phẩm bằng ngôn ngữ tự nhiên — internal use",
    aiCapability: "AIC-28",
    rbacRun: "",
    rbacApprove: "",
    module: "M03",
    status: "available",
    privacyFloor: "SHOP",
    needsApproval: false,
    hidden: true,
  },

  // ============================================================
  // M08 — CHAT ASSISTANT (Repo riêng, dùng ngầm)
  // ============================================================
  {
    key: "chat.intent_routing",
    label: "Hiểu ý định khách (Intent Routing)",
    description: "Phân loại câu hỏi: giá, giao hàng, tìm kiếm, tư vấn, phàn nàn",
    aiCapability: "AIC-31",
    rbacRun: "T1",
    rbacApprove: "",
    module: "M08",
    status: "coming_soon",
    privacyFloor: "SHOP",
    needsApproval: false,
    hidden: true,
  },
  {
    key: "chat.answer",
    label: "Trả lời từ Catalog shop (Grounded)",
    description: "Grounded trên Product Master + Pricing Engine + Delivery zones",
    aiCapability: "AIC-32",
    rbacRun: "T1",
    rbacApprove: "",
    module: "M08",
    status: "coming_soon",
    privacyFloor: "SHOP",
    needsApproval: false,
    hidden: true,
  },

  // ============================================================
  // M11 — ANALYTICS & LEARNING (Core) — DÙNG NGẦM
  // ============================================================
  {
    key: "analytics.interpretation",
    label: "AI diễn giải số liệu",
    description: "Tự viết insight từ reach/engagement/conversion/ROI",
    aiCapability: "AIC-33",
    rbacRun: "S1",
    rbacApprove: "",
    module: "M11",
    status: "coming_soon",
    privacyFloor: "SHOP",
    needsApproval: false,
    hidden: true,
  },
  {
    key: "learning.pattern",
    label: "Học phong cách tổ chức",
    description: "Content features + visual style → learning_profiles, gated S4",
    aiCapability: "AIC-34",
    rbacRun: "S2",
    rbacApprove: "S4",
    module: "M11",
    status: "coming_soon",
    privacyFloor: "SHOP",
    needsApproval: false,
    hidden: true,
  },
];

// ============================================================
// MODULE GROUPS — để render UI accordion theo module
// ============================================================

export const MODULE_GROUPS: ModuleFeatureGroup[] = [
  {
    module: "M01",
    label: "Phân tích sản phẩm bằng AI",
    description: "Nhận diện hoa, đếm cành, màu sắc, phong cách, gói/nơ — chạy gộp 1 lần",
    icon: "ScanSearch",
    features: FEATURE_CATALOG.filter(f => f.module === "M01"),
    isAutoRun: true,
  },
  {
    module: "M01b",
    label: "Dữ liệu bán hàng (Tên, Mô tả, Thẻ, Phân khúc giá)",
    description: "Chỉ chạy sau khi Phân tích ảnh đã được DUYỆT — tick từng mục",
    icon: "FileText",
    features: FEATURE_CATALOG.filter(f => f.module === "M01b"),
    requiresMasterImage: false,
  },
  {
    module: "M04a",
    label: "Master Image (Tăng cường + Identity Guard + 4 tỷ lệ)",
    description: "Chạy 1 lần tạo Master Image — bước bắt buộc trước Creative/Video/Content",
    icon: "Image",
    features: FEATURE_CATALOG.filter(f => f.module === "M04a"),
    isAutoRun: true,
  },
  {
    module: "M04b",
    label: "Creative Studio — Biến thể Marketing",
    description: "Xóa nền, đổi nền, mở rộng, retouch, watermark, biến thể kênh — trên Master Image đã duyệt",
    icon: "Sparkles",
    features: FEATURE_CATALOG.filter(f => f.module === "M04b"),
    requiresMasterImage: true,
  },
  {
    module: "M04c",
    label: "Video Studio",
    description: "Reel, TikTok, Story, Slideshow, Landing Page, Motion Ads — trên Master Image",
    icon: "Video",
    features: FEATURE_CATALOG.filter(f => f.module === "M04c"),
    requiresMasterImage: true,
  },
  {
    module: "M07",
    label: "Content Engine — Nội dung đa kênh",
    description: "FB, IG, TikTok, Zalo, SEO, Hashtag, Ad Copy, Livestream, DM — gắn sản phẩm thật",
    icon: "FileText",
    features: FEATURE_CATALOG.filter(f => f.module === "M07"),
    requiresMasterImage: true,
  },
  {
    module: "M09",
    label: "CRM & Khách hàng",
    description: "Phân nhóm, nhắc mua lại tự động — cần consent khách hàng",
    icon: "Users",
    features: FEATURE_CATALOG.filter(f => f.module === "M09"),
  },
  {
    module: "M06",
    label: "Catalog & QR",
    description: "Catalog số lọc theo dịp/màu/loại/giá, QR code in được",
    icon: "LayoutGrid",
    features: FEATURE_CATALOG.filter(f => f.module === "M06"),
    requiresMasterImage: true,
  },
  {
    module: "M05",
    label: "Landing Page Generator",
    description: "Tự sinh landing page cho Valentine, 8/3, Mother's Day, Khai trương, Hoa cưới",
    icon: "Globe",
    features: FEATURE_CATALOG.filter(f => f.module === "M05"),
    requiresMasterImage: true,
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getFeaturesByModule(module: ModuleKey): SubFeature[] {
  return FEATURE_CATALOG.filter(f => f.module === module && !f.hidden);
}

export function getVisibleFeaturesByModule(module: ModuleKey): SubFeature[] {
  return FEATURE_CATALOG.filter(f => f.module === module && !f.hidden && f.status !== "coming_soon");
}

export function getFeatureByKey(key: string): SubFeature | undefined {
  return FEATURE_CATALOG.find(f => f.key === key);
}

export function getFeaturesByAiCapability(code: string): SubFeature | undefined {
  return FEATURE_CATALOG.find(f => f.aiCapability === code);
}

export function getRunnableFeatures(userCapabilities: string[]): SubFeature[] {
  return FEATURE_CATALOG.filter(f => 
    f.status === "available" && 
    (!f.rbacRun || userCapabilities.includes(f.rbacRun)) &&
    !f.hidden
  );
}

export function getApprovableFeatures(userCapabilities: string[]): SubFeature[] {
  return FEATURE_CATALOG.filter(f => 
    f.needsApproval && 
    f.rbacApprove && 
    userCapabilities.includes(f.rbacApprove)
  );
}

export function getModuleGroup(module: ModuleKey): ModuleFeatureGroup | undefined {
  return MODULE_GROUPS.find(g => g.module === module);
}

export function getModuleGroups(): ModuleFeatureGroup[] {
  return MODULE_GROUPS;
}

// ============================================================
// DEPENDENCY CHECKERS
// ============================================================

export interface DependencyCheck {
  canRun: boolean;
  reason?: string; // canRun=false: lý do khoá; canRun=true: ghi chú cho người chạy
}

export function checkFeatureDependencies(
  feature: SubFeature,
  context: {
    hasApprovedAnalysis: boolean;
    hasApprovedMasterImage: boolean;
  }
): DependencyCheck {
  if (feature.requiresApprovedInput && !context.hasApprovedAnalysis) {
    return { canRun: false, reason: `Cần "${feature.requiresApprovedInput}" đã được duyệt` };
  }
  if (feature.dependsOnMasterImage && !context.hasApprovedMasterImage) {
    return { canRun: false, reason: "Cần Master Image đã được duyệt (M04a)" };
  }
  if (feature.requiresConsent) { // audit L-06: đồng ý là của từng khách (projectMarketingAudience…), trang sản phẩm không có khách cụ thể
    return { canRun: true, reason: "Chỉ gửi cho khách đã đồng ý nhận tin; khách chưa đồng ý tự bị bỏ qua lúc gửi" };
  }
  return { canRun: true };
}

export function checkModuleDependencies(
  module: ModuleKey,
  context: { hasApprovedAnalysis: boolean; hasApprovedMasterImage: boolean }
): DependencyCheck {
  const group = getModuleGroup(module);
  if (!group) return { canRun: true };
  
  if (group.requiresMasterImage && !context.hasApprovedMasterImage) {
    return { canRun: false, reason: "Cần Master Image đã được duyệt (M04a)" };
  }
  if (module === "M01b" && !context.hasApprovedAnalysis) {
    return { canRun: false, reason: "Cần Phân tích ảnh (M01) đã được duyệt" };
  }
  return { canRun: true };
}

// ============================================================
// MODULE → JOB FEATURE MAPPING (cho backend)
// ============================================================

export const MODULE_TO_JOB_FEATURE: Record<ModuleKey, string> = {
  M01: "vision.analyze",
  M01b: "product.copy.generate",
  M04a: "media.optimize",
  M04b: "creative.compose",
  M04c: "video.generate",
  M07: "content.generate",
  M09: "customer.reminder",
  M06: "catalog.generate",
  M05: "landing.generate",
  M03: "search.embedding",
  M08: "chat.assistant",
  M11: "analytics.learning",
};

export function getJobFeatureForModule(module: ModuleKey): string {
  return MODULE_TO_JOB_FEATURE[module] ?? "unknown";
}

export function getCapabilitiesForModule(module: ModuleKey, selectedKeys: string[]): string[] {
  const result: string[] = [];
  for (const key of selectedKeys) {
    const feature = getFeatureByKey(key);
    if (feature && feature.module === module) {
      result.push(feature.aiCapability);
    }
  }
  return result;
}