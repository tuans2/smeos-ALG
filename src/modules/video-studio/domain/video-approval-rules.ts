import { VideoJobEntity } from "./video-types";
import { validateStoryboard } from "./video-storyboard";

export interface ApprovalCheckResult {
  allowed: boolean;
  reason?: string;
  /** Vì sao bị chặn: `state` = sai trạng thái tiến trình (HTTP 409), `content` = nội dung chưa đạt luật (HTTP 422). */
  kind?: "state" | "content";
}

/**
 * Kiểm tra điều kiện phê duyệt Kịch bản (Cổng duyệt 1).
 * Mục đích: Khóa kịch bản trước khi tiến hành bước render tốn kém chi phí.
 */
export function canApproveScript(
  job: Pick<VideoJobEntity, "stage" | "scriptApproval" | "scenes" | "format">
): ApprovalCheckResult {
  if (job.scriptApproval === "APPROVED") {
    return { allowed: false, reason: "Kịch bản đã được phê duyệt trước đó", kind: "state" };
  }

  if (job.stage !== "SCRIPT_READY" && job.stage !== "DRAFT") {
    return {
      allowed: false,
      reason: `Không thể duyệt kịch bản khi tiến trình đang ở trạng thái ${job.stage}`,
      kind: "state",
    };
  }

  const validation = validateStoryboard(job.scenes, job.format);
  if (!validation.isValid) {
    return {
      allowed: false,
      reason: `Kịch bản chưa hợp lệ: ${validation.errors.join("; ")}`,
      kind: "content",
    };
  }

  return { allowed: true };
}

/**
 * Kiểm tra điều kiện kích hoạt Render Video.
 * Bắt buộc: Kịch bản phải được DUYỆT (Cổng 1) trước khi gửi tác vụ render cho worker/AI.
 */
export function canStartRender(
  job: Pick<VideoJobEntity, "stage" | "scriptApproval">
): ApprovalCheckResult {
  if (job.scriptApproval !== "APPROVED") {
    return {
      allowed: false,
      reason: "Bắt buộc phải phê duyệt Kịch bản (Cổng 1) trước khi khởi chạy Render Video",
    };
  }

  if (job.stage === "RENDERING") {
    return {
      allowed: false,
      reason: "Tác vụ render đang được thực thi trong tiến trình nền",
    };
  }

  if (job.stage === "RENDER_COMPLETED" || job.stage === "APPROVED") {
    return {
      allowed: false,
      reason: "Video đã được render hoàn tất. Để làm mới, vui lòng tạo phiên bản mới",
    };
  }

  return { allowed: true };
}

/**
 * Kiểm tra điều kiện phê duyệt Video thành phẩm (Cổng duyệt 2).
 * Mục đích: Kiểm soát chất lượng cuối cùng trước khi đưa vào Kho Video hoặc phân phối.
 */
export function canApproveVideo(
  job: Pick<VideoJobEntity, "stage" | "videoApproval" | "finalVideoUrl" | "finalAssetId">
): ApprovalCheckResult {
  if (job.videoApproval === "APPROVED") {
    return { allowed: false, reason: "Video đã được phê duyệt chính thức", kind: "state" };
  }

  if (job.stage !== "RENDER_COMPLETED") {
    return {
      allowed: false,
      reason: "Chỉ có thể duyệt khi tác vụ render video đã hoàn tất",
      kind: "state",
    };
  }

  if (!job.finalVideoUrl && !job.finalAssetId) {
    return {
      allowed: false,
      reason: "Không tìm thấy tệp video thành phẩm hoặc mã tài sản video để duyệt",
      kind: "content",
    };
  }

  return { allowed: true };
}
