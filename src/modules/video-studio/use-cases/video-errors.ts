import { AppError, conflict, unprocessable } from "@/core/http/errors";
import type { ApprovalCheckResult } from "../domain/video-approval-rules";

/**
 * Lỗi HTTP của Video Studio (08/11/2026, audit API §13): trước đây use-case ném
 * `Error` trần nên không thấy job (kể cả job của tổ chức khác) hay sai trạng thái
 * đều thành 500. Không thấy → 404 (không lộ job có tồn tại ở tổ chức khác hay không),
 * sai trạng thái → 409, nội dung chưa đạt luật → 422.
 */
export function videoJobNotFound(): AppError {
  return new AppError("NOT_FOUND", "Không tìm thấy tác vụ video");
}

export function approvalBlocked(check: ApprovalCheckResult, fallback: string): AppError {
  const message = check.reason || fallback;
  return check.kind === "content" ? unprocessable(message) : conflict(message);
}
