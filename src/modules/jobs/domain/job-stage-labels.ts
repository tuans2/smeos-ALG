/**
 * Nhãn tiếng Việt cho `generation_jobs.stage` (giá trị worker ghi khi đang chạy). Audit hành trình O6 (gói
 * UJ-07): màn chi tiết tác vụ và "Trung tâm tăng trưởng" hiện thẳng mã như `RENDERING`, `VEO_SUBMITTING` — vừa
 * là mã kỹ thuật vừa lộ tên nhà cung cấp. Mã chưa có nhãn → câu chung, không lộ mã.
 */
const JOB_STAGE_LABELS: Record<string, string> = {
  DETECTING: "Đang nhận diện ảnh",
  RESOLVING_ASSETS: "Đang chuẩn bị tư liệu",
  GENERATING: "Đang tạo nội dung",
  COMPOSING: "Đang ghép bố cục",
  AUDIO_SYNTHESIS: "Đang tạo giọng đọc",
  RENDERING: "Đang dựng video",
  CAPTION_RENDERING: "Đang chèn phụ đề",
  ASSEMBLING: "Đang ghép thành phẩm",
  VEO_SUBMITTING: "Đang gửi yêu cầu dựng",
  VEO_PROCESSING: "Đang dựng video",
  HEYGEN_SUBMITTING: "Đang gửi yêu cầu dựng",
  HEYGEN_PROCESSING: "Đang dựng video",
  RENDER_COMPLETED: "Đã dựng xong",
}

export const UNKNOWN_JOB_STAGE_LABEL = "Đang xử lý"

export function jobStageLabel(stage: string | null | undefined): string | null {
  if (!stage) return null
  return JOB_STAGE_LABELS[stage] ?? UNKNOWN_JOB_STAGE_LABEL
}
