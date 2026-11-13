/**
 * Bảng Kanban của Sale: cùng một tập đơn/link (quy trình theo dõi), mỗi bước 1→9 là một cột riêng.
 * Trong cột: việc kẹt của Sale lên đầu, rồi đơn giao sớm hơn, rồi đơn vừa đổi bước. Pure TypeScript.
 */
import { slotStartHour } from "./coordinator-board"
import { PIPELINE_STEPS, type StepDefinition, type TrackingPipelineStepId } from "./tracking-pipeline-types"
import type { StuckInfo } from "./step-sla"

export interface SaleKanbanColumn<T> {
  step: StepDefinition
  items: T[]
  /** Số thẻ trong cột đang kẹt ở phần việc của Sale. */
  needsMe: number
}

interface KanbanItem {
  currentStepId: TrackingPipelineStepId
  stepStartedAt: string
  stuck: StuckInfo | null
  deliveryDate?: string | null | undefined
  deliveryTimeSlot?: string | null | undefined
}

export function groupSaleKanban<T extends KanbanItem>(
  items: T[],
  steps: StepDefinition[] = PIPELINE_STEPS
): SaleKanbanColumn<T>[] {
  const sorted = [...items].sort((a, b) => {
    // 1. Việc kẹt của Sale lên đầu, kẹt lâu hơn đứng trước
    const am = a.stuck?.owner === "SALE" ? a.stuck.overdueMinutes : -1
    const bm = b.stuck?.owner === "SALE" ? b.stuck.overdueMinutes : -1
    if (am !== bm) return bm - am
    // 2. Đơn giao sớm hơn đứng trước (ngày rồi giờ bắt đầu khung, gồm cả "Giờ cụ thể"); thiếu mốc → xếp sau
    const ad = a.deliveryDate || "9999-12-31"
    const bd = b.deliveryDate || "9999-12-31"
    if (ad !== bd) return ad.localeCompare(bd)
    const ah = slotStartHour(a.deliveryTimeSlot)
    const bh = slotStartHour(b.deliveryTimeSlot)
    if (ah !== bh) return ah - bh
    // 3. Còn lại: đơn vừa đổi bước lên trước
    return Date.parse(b.stepStartedAt) - Date.parse(a.stepStartedAt)
  })

  return [...steps]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((step) => {
      const colItems = sorted.filter((i) => i.currentStepId === step.id)
      return { step, items: colItems, needsMe: colItems.filter((i) => i.stuck?.owner === "SALE").length }
    })
}
