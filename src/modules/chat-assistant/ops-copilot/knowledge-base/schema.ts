/**
 * Ops Knowledge Base Schema & Types.
 * Định nghĩa cấu trúc dữ liệu tri thức nguyên tử cho OPS Copilot của ALG.
 */

export type OpsTargetRole = "ALL" | "QUAN_LY" | "BAN_HANG" | "THO_CAM" | "GIAO_HANG"

export type OpsResponseStyle =
  | "CONSULTANT"      // Chuyên gia Cố vấn Vận hành (Quản lý / Điều hành)
  | "COACH"           // Hướng dẫn viên Cầm tay chỉ việc (Bán hàng / Thợ chế tác / Mới)
  | "TROUBLESHOOTER"  // Kỹ thuật viên Khắc phục Sự cố (Khi gặp lỗi)
  | "FAST_SOP"        // Tóm tắt Siêu tốc Giờ cao điểm (Ngắn gọn, hành động ngay)

export interface OpsKnowledgeStep {
  stepNumber: number
  actionText: string
  expectedResult?: string
}

export interface OpsKnowledgeNode {
  id: string
  moduleIndex: number
  moduleTitle: string
  topicTitle: string
  routePath: string
  targetRoles: OpsTargetRole[]
  keywords: string[]
  intents: string[]
  summary: string
  stepByStepSOP: OpsKnowledgeStep[]
  caveatsAndGotchas: string[]
  actionLabel: string
  quickPrompts?: string[]
}
