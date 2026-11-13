/**
 * Định nghĩa các kiểu thực thể thuần (Domain Types) cho AI Video Studio (M04c).
 * Tuyệt đối không import Prisma hay Framework hạ tầng.
 */

export type VideoFormat =
  | "REEL_15S"
  | "TIKTOK_30S"
  | "STORY_15S"
  | "SLIDESHOW"
  | "PRODUCT_PAGE"
  | "AD_MOTION";

export type VideoStage =
  | "DRAFT"
  | "SCRIPT_GENERATING"
  | "SCRIPT_READY"
  | "SCRIPT_APPROVED"
  | "RENDERING"
  | "RENDER_COMPLETED"
  | "APPROVED"
  | "REJECTED"
  | "FAILED";

export type ApprovalState = "PENDING" | "APPROVED" | "REJECTED";

export interface VideoFormatSpec {
  format: VideoFormat;
  label: string;
  targetDurationSeconds: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
  aspectRatio: "9:16" | "1:1" | "16:9" | "4:5";
  minScenes: number;
  maxScenes: number;
  aiCapability: string;
  defaultCreditCost: number;
}

export const VIDEO_FORMAT_SPECS: Record<VideoFormat, VideoFormatSpec> = {
  REEL_15S: {
    format: "REEL_15S",
    label: "Instagram Reel 15s",
    targetDurationSeconds: 15,
    minDurationSeconds: 8,
    maxDurationSeconds: 20,
    aspectRatio: "9:16",
    minScenes: 2,
    maxScenes: 8,
    aiCapability: "AIC-18",
    defaultCreditCost: 25,
  },
  TIKTOK_30S: {
    format: "TIKTOK_30S",
    label: "TikTok / Shorts 30s",
    targetDurationSeconds: 30,
    minDurationSeconds: 15,
    maxDurationSeconds: 40,
    aspectRatio: "9:16",
    minScenes: 2,
    maxScenes: 15,
    aiCapability: "AIC-19",
    defaultCreditCost: 35,
  },
  STORY_15S: {
    format: "STORY_15S",
    label: "Story 15s (IG/FB/Zalo)",
    targetDurationSeconds: 15,
    minDurationSeconds: 8,
    maxDurationSeconds: 18,
    aspectRatio: "9:16",
    minScenes: 2,
    maxScenes: 8,
    aiCapability: "AIC-20",
    defaultCreditCost: 20,
  },
  SLIDESHOW: {
    format: "SLIDESHOW",
    label: "Slideshow chuyển cảnh Ken Burns (FFmpeg)",
    targetDurationSeconds: 20,
    minDurationSeconds: 6,
    maxDurationSeconds: 60,
    aspectRatio: "9:16",
    minScenes: 2,
    maxScenes: 15,
    aiCapability: "AIC-21",
    defaultCreditCost: 10,
  },
  PRODUCT_PAGE: {
    format: "PRODUCT_PAGE",
    label: "Video chi tiết sản phẩm Web/E-commerce",
    targetDurationSeconds: 20,
    minDurationSeconds: 10,
    maxDurationSeconds: 35,
    aspectRatio: "1:1",
    minScenes: 2,
    maxScenes: 8,
    aiCapability: "AIC-22",
    defaultCreditCost: 30,
  },
  AD_MOTION: {
    format: "AD_MOTION",
    label: "Motion quảng cáo tương tác cao",
    targetDurationSeconds: 15,
    minDurationSeconds: 8,
    maxDurationSeconds: 25,
    aspectRatio: "9:16",
    minScenes: 2,
    maxScenes: 8,
    aiCapability: "AIC-23",
    defaultCreditCost: 40,
  },
};

export type CaptionStyle =
  | "MODERN_BADGE"
  | "MINIMAL_ELEGANT"
  | "HIGHLIGHT_BOX"
  | "BOTTOM_BANNER"
  | "NONE";

export interface CaptionStyleSpec {
  style: CaptionStyle;
  label: string;
  description: string;
  badgeBg: string;
  textColor: string;
  iconName: string;
}

export const CAPTION_STYLE_SPECS: Record<CaptionStyle, CaptionStyleSpec> = {
  MODERN_BADGE: {
    style: "MODERN_BADGE",
    label: "Hộp mờ hiện đại",
    description: "Khung pill đen mờ bo tròn, chữ trắng nổi bật chuẩn TikTok/Reels",
    badgeBg: "rgba(0,0,0,0.65)",
    textColor: "#ffffff",
    iconName: "Square",
  },
  MINIMAL_ELEGANT: {
    style: "MINIMAL_ELEGANT",
    label: "Thanh lịch tinh tế",
    description: "Chữ trắng bóng đổ mềm mại, không viền, tôn trọn vẻ đẹp ảnh hoa",
    badgeBg: "transparent",
    textColor: "#ffffff",
    iconName: "Sparkles",
  },
  HIGHLIGHT_BOX: {
    style: "HIGHLIGHT_BOX",
    label: "Hộp điểm nhấn Gen Z",
    description: "Nền vàng rực rỡ / hồng pastel, tương phản cao, bắt mắt người xem",
    badgeBg: "#facc15",
    textColor: "#1f2937",
    iconName: "Zap",
  },
  BOTTOM_BANNER: {
    style: "BOTTOM_BANNER",
    label: "Dải băng tin tức",
    description: "Dải băng ngang chân video chuyên nghiệp như bản tin truyền hình",
    badgeBg: "rgba(15,23,42,0.85)",
    textColor: "#ffffff",
    iconName: "AlignJustify",
  },
  NONE: {
    style: "NONE",
    label: "Tắt phụ đề",
    description: "Không hiển thị chữ phụ đề trên video",
    badgeBg: "transparent",
    textColor: "#94a3b8",
    iconName: "EyeOff",
  },
};

export type VideoMotionEffect =
  | "ZOOM_IN"
  | "ZOOM_OUT"
  | "PAN_UP"
  | "PAN_RIGHT"
  | "STATIC";

export interface VideoMotionSpec {
  motion: VideoMotionEffect;
  label: string;
  description: string;
  iconName: string;
}

export const VIDEO_MOTION_SPECS: Record<VideoMotionEffect, VideoMotionSpec> = {
  ZOOM_IN: {
    motion: "ZOOM_IN",
    label: "Zoom In (Cận cảnh)",
    description: "Thu phóng chậm rãi vào chi tiết hoa",
    iconName: "ZoomIn",
  },
  ZOOM_OUT: {
    motion: "ZOOM_OUT",
    label: "Zoom Out (Toàn cảnh)",
    description: "Mở rộng góc nhìn ra trọn sản phẩm",
    iconName: "ZoomOut",
  },
  PAN_UP: {
    motion: "PAN_UP",
    label: "Pan Lên (Dọc cành)",
    description: "Lướt từ chân cành lên đỉnh hoa",
    iconName: "ArrowUp",
  },
  PAN_RIGHT: {
    motion: "PAN_RIGHT",
    label: "Pan Ngang (Lia máy)",
    description: "Lia máy ngang ngắm dải màu hoa",
    iconName: "ArrowRight",
  },
  STATIC: {
    motion: "STATIC",
    label: "Cảnh tĩnh",
    description: "Giữ góc nhìn tĩnh không chuyển động",
    iconName: "Square",
  },
};

export type VideoProviderType = "LOCAL_CINEMATIC" | "VEO" | "HEYGEN";

/**
 * Phân rã trường nguyên tử cho từng cảnh kịch bản (Atomic Disaggregated Fields).
 * Cho phép người dùng sửa độc lập từng trường mà không làm hỏng cấu trúc.
 */
export interface VideoSceneItem {
  id?: string | undefined;
  sceneIndex: number;
  durationSeconds: number;
  imageAssetId?: string | null | undefined;
  imageUrl?: string | null | undefined;
  textOverlay?: string | null | undefined;
  voiceScript?: string | null | undefined;
  transitionEffect?: "fade" | "slide_left" | "slide_right" | "zoom_in" | "zoom_out" | "dissolve" | undefined;
  motionEffect?: VideoMotionEffect | undefined;
}

export interface VideoJobEntity {
  id: string;
  organizationId: string;
  productId?: string | null;
  title: string;
  format: VideoFormat;
  stage: VideoStage;
  scriptApproval: ApprovalState;
  scriptApprovedAt?: Date | null;
  scriptApprovedBy?: string | null;
  videoApproval: ApprovalState;
  videoApprovedAt?: Date | null;
  videoApprovedBy?: string | null;
  durationSeconds: number;
  aspectRatio: string;
  musicTrack?: string | null;
  voiceCode?: string | null;
  hasSubtitle: boolean;
  captionStyle: CaptionStyle;
  hasWatermark: boolean;
  finalVideoUrl?: string | null;
  finalAssetId?: string | null;
  costCredits: number;
  errorMessage?: string | null;
  scenes: VideoSceneItem[];
  createdAt: Date;
  updatedAt: Date;
}

