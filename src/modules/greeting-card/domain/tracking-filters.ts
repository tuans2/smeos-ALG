/** Nhóm lọc nhanh cho tab Theo dõi tiến độ (toàn tiệm, chỉ xem). Pure TypeScript. */
import type { StuckInfo } from "./step-sla"
import type { TrackingPipelineStepId } from "./tracking-pipeline-types"
import { getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"

export type TrackingCategory = "ALL" | "STUCK" | "BROWSING" | "PAYMENT" | "ARRANGING" | "DELIVERING" | "COMPLETED"

export const TRACKING_CATEGORIES: Array<{ id: TrackingCategory; label: string; steps?: TrackingPipelineStepId[] }> = [
  { id: "ALL", label: "Tất cả" },
  { id: "STUCK", label: "Đang kẹt" },
  { id: "BROWSING", label: "Khách đang chọn", steps: ["STEP_1_OPENED", "STEP_2_CHOOSING", "STEP_3_FILLING_FORM"] },
  { id: "PAYMENT", label: "Chờ xác nhận tiền", steps: ["STEP_4_PAYMENT_PENDING"] },
  { id: "ARRANGING", label: "Đang thực hiện", steps: ["STEP_5_PAYMENT_CONFIRMED", "STEP_6_ARRANGING", "STEP_7_READY_QC"] },
  { id: "DELIVERING", label: "Đang giao", steps: ["STEP_8_DELIVERING"] },
  { id: "COMPLETED", label: "Hoàn tất", steps: ["STEP_9_COMPLETED"] },
]

export function getIndustryTrackingCategories(
  industryKey?: string | null
): Array<{ id: TrackingCategory; label: string; steps?: TrackingPipelineStepId[] }> {
  const orderTerms = getIndustryOrderTerms(industryKey)
  const isStay = orderTerms.fulfillmentFlow === "CALENDAR_STAY"
  return [
    { id: "ALL", label: "Tất cả" },
    { id: "STUCK", label: "Đang kẹt" },
    {
      id: "BROWSING",
      label: isStay ? "Khách đang chọn phòng" : "Khách đang chọn",
      steps: ["STEP_1_OPENED", "STEP_2_CHOOSING", "STEP_3_FILLING_FORM"],
    },
    { id: "PAYMENT", label: "Chờ xác nhận tiền", steps: ["STEP_4_PAYMENT_PENDING"] },
    {
      id: "ARRANGING",
      label: orderTerms.productionStepLabel ? `Đang ${orderTerms.productionStepLabel.toLowerCase()}` : "Đang thực hiện",
      steps: ["STEP_5_PAYMENT_CONFIRMED", "STEP_6_ARRANGING", "STEP_7_READY_QC"],
    },
    {
      id: "DELIVERING",
      label: isStay ? "Nhận phòng / Lưu trú" : orderTerms.trackingDeliveryStepLabel || "Đang giao",
      steps: ["STEP_8_DELIVERING"],
    },
    { id: "COMPLETED", label: "Hoàn tất", steps: ["STEP_9_COMPLETED"] },
  ]
}

interface Filterable {
  currentStepId: TrackingPipelineStepId
  stepStartedAt: string
  stuck: StuckInfo | null
  saleName: string
  channel: string
}

export function inCategory(item: Filterable, category: TrackingCategory): boolean {
  if (category === "ALL") return true
  if (category === "STUCK") return item.stuck !== null
  return TRACKING_CATEGORIES.find((c) => c.id === category)?.steps?.includes(item.currentStepId) ?? false
}

export function filterTracking<T extends Filterable>(
  items: T[],
  f: { category: TrackingCategory; saleName: string | null; channel: string | null },
): T[] {
  return items
    .filter((i) => inCategory(i, f.category) && (!f.saleName || i.saleName === f.saleName) && (!f.channel || i.channel === f.channel))
    .sort((a, b) => (b.stuck?.overdueMinutes ?? -1) - (a.stuck?.overdueMinutes ?? -1) || Date.parse(b.stepStartedAt) - Date.parse(a.stepStartedAt))
}

/** Danh sách giá trị khác nhau (cho ô chọn sale/kênh), theo bảng chữ cái. */
export const distinct = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"))
