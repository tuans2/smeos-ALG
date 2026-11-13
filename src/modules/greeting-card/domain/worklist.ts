/**
 * Danh sách việc theo vai (Sale / Điều phối) dựng từ cùng một quy trình theo dõi:
 * đơn kẹt đúng phần việc của mình lên đầu, rồi đến đơn vừa đổi bước. Pure TypeScript.
 */
import type { StepOwner, StuckInfo } from "./step-sla"
import type { TrackingPipelineStepId } from "./tracking-pipeline-types"

export type WorkBucket = "ACTION" | "WAITING_CUSTOMER" | "IN_PROGRESS" | "DONE" | "CANCELLED"

export const WORK_BUCKET_LABEL: Record<WorkBucket, string> = {
  ACTION: "Cần tôi làm",
  WAITING_CUSTOMER: "Đang chờ khách",
  IN_PROGRESS: "Đang làm đơn",
  DONE: "Xong",
  CANCELLED: "Đã huỷ / Quá hạn",
}

interface WorkItem {
  currentStepId: TrackingPipelineStepId
  stepStartedAt: string
  stuck: StuckInfo | null
  isCancelled?: boolean | undefined
}

const CUSTOMER_STEPS: TrackingPipelineStepId[] = ["STEP_1_OPENED", "STEP_2_CHOOSING", "STEP_3_FILLING_FORM"]

export function workBucket(item: WorkItem, me: StepOwner): WorkBucket {
  if (item.isCancelled) return "CANCELLED"
  if (item.currentStepId === "STEP_9_COMPLETED") return "DONE"
  if (item.stuck?.owner === me) return "ACTION"
  return CUSTOMER_STEPS.includes(item.currentStepId) ? "WAITING_CUSTOMER" : "IN_PROGRESS"
}

/** Việc của tôi đang kẹt lên đầu (quá lâu nhất trước), còn lại đơn vừa đổi bước trước. */
export function sortWorklist<T extends WorkItem>(items: T[], me: StepOwner): T[] {
  return [...items].sort((a, b) => {
    const am = a.stuck?.owner === me ? a.stuck.overdueMinutes : -1
    const bm = b.stuck?.owner === me ? b.stuck.overdueMinutes : -1
    if (am !== bm) return bm - am
    return Date.parse(b.stepStartedAt) - Date.parse(a.stepStartedAt)
  })
}
