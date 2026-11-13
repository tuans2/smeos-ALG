/**
 * Từ vựng trạng thái tác vụ nền dùng chung cho mọi màn (03c UX-016).
 *
 * Giá trị backend (`job_status`, `asset_state`, `video_stage`, chuỗi trạng thái của
 * các bảng khác) giữ nguyên trong schema/API — mọi màn ánh xạ sang UI qua
 * `taskStateFromBackend`, không tự đặt nhãn riêng. Giá trị lạ trả về `null`:
 * không bao giờ suy ra "đã xong" từ thứ không nhận ra được.
 */

export type TaskUiState =
  | "idle"
  | "validating"
  | "submitting"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled"

/** Thất bại thử lại được, hay cần người dùng làm việc khác trước. */
export type TaskFailureKind = "retryable" | "needs_action"

/** Nhãn chuẩn theo `docs/dac-ta/ux-patterns/glossary.md`. */
export const TASK_STATE_LABEL: Record<TaskUiState, string> = {
  idle: "Chưa bắt đầu",
  validating: "Đang kiểm tra",
  submitting: "Đang gửi",
  queued: "Đang chờ xử lý",
  running: "Đang xử lý",
  succeeded: "Đã xong",
  failed: "Chưa xong được",
  canceled: "Đã hủy",
}

const BACKEND_TO_UI: Record<string, TaskUiState> = {
  PENDING: "queued",
  QUEUED: "queued",
  ENQUEUED: "queued",
  CREATED: "queued",
  PROCESSING: "running",
  RUNNING: "running",
  IN_PROGRESS: "running",
  GENERATING: "running",
  SCRIPT_GENERATING: "running",
  RENDERING: "running",
  COMPLETED: "succeeded",
  SUCCEEDED: "succeeded",
  DONE: "succeeded",
  READY: "succeeded",
  SCRIPT_READY: "succeeded",
  RENDER_COMPLETED: "succeeded",
  FAILED: "failed",
  ERROR: "failed",
  CANCELLED: "canceled",
  CANCELED: "canceled",
}

/** Kết quả đã xong nhưng còn chờ người có quyền duyệt. */
const NEEDS_REVIEW = new Set(["SCRIPT_READY", "RENDER_COMPLETED"])

export function taskStateFromBackend(status: string | null | undefined): TaskUiState | null {
  if (!status) return null
  return BACKEND_TO_UI[status.trim().toUpperCase()] ?? null
}

export function taskNeedsReview(status: string | null | undefined): boolean {
  return !!status && NEEDS_REVIEW.has(status.trim().toUpperCase())
}

export function isTaskTerminal(state: TaskUiState): boolean {
  return state === "succeeded" || state === "failed" || state === "canceled"
}

/** Đang chạy hoặc đang gửi — nút gửi phải khóa để chống bấm trùng. */
export function isTaskBusy(state: TaskUiState): boolean {
  return state === "validating" || state === "submitting" || state === "queued" || state === "running"
}

/**
 * Chỉ trả về phần trăm khi backend thật sự báo tiến độ (0–100).
 * Không có số thật → `null`, giao diện hiện "Đang xử lý" thay vì phần trăm giả.
 */
export function reportedProgress(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function taskStateLabel(state: TaskUiState, needsReview = false): string {
  if (state === "succeeded" && needsReview) return "Đã xong — chờ duyệt"
  return TASK_STATE_LABEL[state]
}
