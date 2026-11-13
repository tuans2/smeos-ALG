import { VideoFormat, VIDEO_FORMAT_SPECS } from "./video-types";

export interface VideoCostCalculation {
  baseCredits: number;
  voiceCredits: number;
  durationMultiplier: number;
  totalCredits: number;
  isFreeTierEligible: boolean;
}

/**
 * Tính toán chi phí Credit cho việc dựng video theo chuẩn AIC-18 đến AIC-23.
 */
export function calculateVideoCreditCost(params: {
  format: VideoFormat;
  durationSeconds: number;
  hasAiVoice: boolean;
  isSlideshowLocal?: boolean;
}): VideoCostCalculation {
  const { format, durationSeconds, hasAiVoice, isSlideshowLocal } = params;
  const spec = VIDEO_FORMAT_SPECS[format];
  const baseCredits = spec ? spec.defaultCreditCost : 20;

  // Nếu là local slideshow (FFmpeg native), chi phí 0 hoặc tượng trưng
  if (isSlideshowLocal && format === "SLIDESHOW") {
    return {
      baseCredits: 5,
      voiceCredits: hasAiVoice ? 5 : 0,
      durationMultiplier: 1.0,
      totalCredits: hasAiVoice ? 10 : 5,
      isFreeTierEligible: true,
    };
  }

  // Voiceover AI tốn thêm 5 credits
  const voiceCredits = hasAiVoice ? 5 : 0;

  // Hệ số theo thời lượng: nếu vượt target, tăng nhẹ hệ số
  const target = spec?.targetDurationSeconds || 15;
  const durationMultiplier = durationSeconds > target ? Math.min(1.5, durationSeconds / target) : 1.0;

  const totalCredits = Math.round((baseCredits + voiceCredits) * durationMultiplier);

  return {
    baseCredits,
    voiceCredits,
    durationMultiplier: Math.round(durationMultiplier * 100) / 100,
    totalCredits,
    isFreeTierEligible: false,
  };
}

/**
 * Kiểm tra xem khi job thất bại có được hoàn credit không.
 * Nguyên tắc: Thất bại do lỗi hệ thống/AI provider được hoàn 100% credit đã trừ.
 */
export function shouldRefundCreditsOnFailure(status: string): boolean {
  return status === "FAILED" || status === "ERROR";
}
