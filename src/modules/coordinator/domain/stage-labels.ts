import type { CoordinatorStage } from "./coordinator-types"

/** Nhãn tiếng Việt của bước điều phối — dùng cho giao diện và thông điệp lỗi (audit BL-18: không lộ mã bước). */
export const STAGE_LABELS: Record<CoordinatorStage, string> = {
  INTAKE: "Tiếp nhận đơn",
  VALIDATING: "Đang thẩm định đơn",
  PLANNING: "Lập kế hoạch",
  ASSIGNING: "Chờ phân công xưởng",
  IN_PRODUCTION: "Đang chế tác",
  QUALITY_CHECK: "Chờ kiểm định QC",
  DISPATCHING: "Đang giao hàng",
  DELIVERED: "Đã giao (chờ đóng đơn)",
  COMPLETED: "Hoàn tất",
  EXCEPTION: "Sự cố cần xử lý",
  CANCELLED: "Đã huỷ",
}

export function stageLabel(stage: CoordinatorStage): string {
  return STAGE_LABELS[stage] ?? stage
}
