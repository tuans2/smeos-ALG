import {
  VideoFormat,
  VIDEO_FORMAT_SPECS,
  VideoSceneItem,
  VideoMotionEffect,
} from "./video-types";

export interface StoryboardValidationResult {
  isValid: boolean;
  errors: string[];
  totalDurationSeconds: number;
  sceneCount: number;
}

/**
 * Tính tổng thời lượng của các cảnh trong kịch bản.
 */
export function calculateTotalDuration(scenes: VideoSceneItem[]): number {
  return scenes.reduce((total, scene) => total + (scene.durationSeconds || 0), 0);
}

/**
 * Kiểm định tính hợp lệ của kịch bản phân cảnh (Storyboard).
 * Tuân thủ quy tắc M04c:
 * 1. Số lượng cảnh nằm trong ngưỡng cho phép của khuôn video.
 * 2. Tổng thời lượng khớp với target / min / max duration của khuôn.
 * 3. Mỗi cảnh có thời lượng tối thiểu 1.0s và tối đa 15.0s.
 * 4. Nếu có ảnh Master Image yêu cầu, cảnh đầu và cảnh cuối cần được gắn kết ảnh hợp lệ.
 */
export function validateStoryboard(
  scenes: VideoSceneItem[],
  format: VideoFormat,
  options?: { requireMasterImageAnchor?: boolean; masterImageAssetId?: string }
): StoryboardValidationResult {
  const errors: string[] = [];
  const spec = VIDEO_FORMAT_SPECS[format];

  if (!spec) {
    return {
      isValid: false,
      errors: [`Khuôn video không hợp lệ: ${format}`],
      totalDurationSeconds: 0,
      sceneCount: scenes.length,
    };
  }

  if (!scenes || scenes.length === 0) {
    return {
      isValid: false,
      errors: ["Kịch bản phải có ít nhất 1 cảnh phân đoạn"],
      totalDurationSeconds: 0,
      sceneCount: 0,
    };
  }

  // 1. Kiểm tra số lượng cảnh
  if (scenes.length < spec.minScenes) {
    errors.push(
      `Khuôn ${spec.label} yêu cầu tối thiểu ${spec.minScenes} cảnh (hiện có ${scenes.length})`
    );
  } else if (scenes.length > spec.maxScenes) {
    errors.push(
      `Khuôn ${spec.label} tối đa ${spec.maxScenes} cảnh (hiện có ${scenes.length})`
    );
  }

  // 2. Kiểm tra thời lượng từng cảnh
  scenes.forEach((scene, index) => {
    if (!scene.durationSeconds || scene.durationSeconds < 1.0) {
      errors.push(`Cảnh #${index + 1} có thời lượng quá ngắn (tối thiểu 1.0 giây)`);
    } else if (scene.durationSeconds > 15.0) {
      errors.push(`Cảnh #${index + 1} có thời lượng quá dài (tối đa 15.0 giây)`);
    }
  });

  // 3. Kiểm tra tổng thời lượng
  const totalDuration = calculateTotalDuration(scenes);
  if (totalDuration < spec.minDurationSeconds) {
    errors.push(
      `Tổng thời lượng ${totalDuration.toFixed(1)}s ngắn hơn mức tối thiểu ${spec.minDurationSeconds}s của khuôn ${spec.label}`
    );
  } else if (totalDuration > spec.maxDurationSeconds) {
    errors.push(
      `Tổng thời lượng ${totalDuration.toFixed(1)}s vượt quá mức tối đa ${spec.maxDurationSeconds}s của khuôn ${spec.label}`
    );
  }

  // 4. Kiểm tra nguyên tắc Master Image ở cảnh đầu hoặc cảnh cuối (nếu có yêu cầu)
  if (options?.requireMasterImageAnchor && options?.masterImageAssetId) {
    const firstScene = scenes[0];
    const lastScene = scenes[scenes.length - 1];
    const isAnchored =
      firstScene?.imageAssetId === options.masterImageAssetId ||
      lastScene?.imageAssetId === options.masterImageAssetId;

    if (!isAnchored) {
      errors.push(
        "Quy tắc M04c: Cảnh đầu hoặc cảnh cuối của video phải gắn kết với Master Image đã duyệt của sản phẩm"
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    totalDurationSeconds: Math.round(totalDuration * 10) / 10,
    sceneCount: scenes.length,
  };
}

const DEFAULT_MOTIONS: VideoMotionEffect[] = [
  "ZOOM_IN",
  "PAN_RIGHT",
  "ZOOM_OUT",
  "PAN_UP",
];

/**
 * Chuẩn hóa danh sách cảnh: đánh lại chỉ số index tuần tự từ 1 đến N.
 * Tự động gán hiệu ứng chuyển động máy quay điện ảnh luân phiên nếu chưa có.
 */
/**
 * Phụ đề LUÔN là lời thoại (quyết định PO 24/09/2026): chữ trên video chính là
 * câu được đọc. Cảnh không có lời thoại thì không có phụ đề.
 */
export function subtitleOf(scene: { voiceScript?: string | null | undefined }): string {
  return (scene.voiceScript ?? "").trim()
}

export function normalizeScenes(scenes: VideoSceneItem[]): VideoSceneItem[] {
  return scenes.map((scene, idx) => ({
    ...scene,
    textOverlay: subtitleOf(scene),
    sceneIndex: idx + 1,
    durationSeconds: Math.max(1.0, Math.round((scene.durationSeconds || 3.0) * 10) / 10),
    transitionEffect: scene.transitionEffect ?? "fade",
    motionEffect: scene.motionEffect ?? DEFAULT_MOTIONS[idx % DEFAULT_MOTIONS.length]!,
  }));
}
