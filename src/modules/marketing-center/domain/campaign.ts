/**
 * Chiến dịch Quảng bá & Bán hàng (Campaign Domain) — Pure TypeScript.
 *
 * Quản lý mục tiêu, dịp/sự kiện, thời gian chạy và tập hợp Asset Usages.
 * Tuân thủ SSR/SRP, không import Prisma/ORM.
 */

export const CAMPAIGN_OBJECTIVES = ["AWARENESS", "LEAD", "SALE", "RETENTION"] as const
export type CampaignObjective = (typeof CAMPAIGN_OBJECTIVES)[number]

export const CAMPAIGN_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

export const CAMPAIGN_OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  AWARENESS: "Nhận biết thương hiệu",
  LEAD: "Thu hút khách tiềm năng",
  SALE: "Thúc đẩy bán hàng",
  RETENTION: "Chăm sóc & Giữ chân",
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Bản nháp",
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  COMPLETED: "Hoàn thành",
  ARCHIVED: "Đã lưu trữ",
}

export interface Campaign {
  id: string
  organizationId: string
  name: string
  objective: CampaignObjective
  occasionCode: string | null
  startsAt: Date | null
  endsAt: Date | null
  status: CampaignStatus
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface CampaignStats {
  totalUsages: number
  totalScans: number
  totalLeads: number
  convertedOrders: number
}

export interface CreateCampaignInput {
  name: string
  objective: CampaignObjective
  occasionCode?: string | null | undefined
  startsAt?: Date | string | null | undefined
  endsAt?: Date | string | null | undefined
  status?: CampaignStatus | undefined
}

export const CAMPAIGN_NAME_MAX = 150

export function validateCampaignInput(input: CreateCampaignInput): Record<string, string> {
  const errors: Record<string, string> = {}
  const name = input.name ? input.name.trim() : ""
  if (!name) errors.name = "Tên chiến dịch không được để trống"
  else if (name.length > CAMPAIGN_NAME_MAX) errors.name = `Tên chiến dịch tối đa ${CAMPAIGN_NAME_MAX} ký tự`

  if (!CAMPAIGN_OBJECTIVES.includes(input.objective)) {
    errors.objective = `Mục tiêu chiến dịch phải là một trong: ${CAMPAIGN_OBJECTIVES.join(", ")}`
  }

  if (input.status && !CAMPAIGN_STATUSES.includes(input.status)) {
    errors.status = `Trạng thái chiến dịch phải là một trong: ${CAMPAIGN_STATUSES.join(", ")}`
  }

  if (input.startsAt && input.endsAt) {
    const start = new Date(input.startsAt).getTime()
    const end = new Date(input.endsAt).getTime()
    if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
      errors.endsAt = "Thời gian kết thúc không thể trước thời gian bắt đầu"
    }
  }

  return errors
}

export const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, readonly CampaignStatus[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["PAUSED", "COMPLETED", "ARCHIVED"],
  PAUSED: ["ACTIVE", "COMPLETED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED", "ACTIVE"],
  ARCHIVED: ["DRAFT"],
}

export function canTransitionCampaignStatus(current: CampaignStatus, next: CampaignStatus): boolean {
  if (current === next) return true
  const allowed = CAMPAIGN_TRANSITIONS[current]
  return allowed ? allowed.includes(next) : false
}

