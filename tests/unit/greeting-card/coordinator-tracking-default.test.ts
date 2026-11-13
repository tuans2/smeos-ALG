import { describe, expect, it } from "vitest"
import { parseStepSla } from "@/modules/greeting-card/domain/step-sla"
import { filterAndSort, slaStatusOf, type TrackingViewItem } from "@/modules/greeting-card/domain/tracking-views"
import { PIPELINE_STEPS, type TrackingPipelineItem } from "@/modules/greeting-card/domain/tracking-pipeline-types"
import { COORDINATOR_DEFAULT, presetViews } from "@/components/greeting-card/tracking/views/tracking-view-state"
import { defaultTheChaoView } from "@/components/greeting-card/default-view"

const now = new Date("2026-10-16T03:00:00Z")
const item = (stepId: TrackingPipelineItem["currentStepId"]): TrackingViewItem => {
  const raw = { id: stepId, currentStepId: stepId, stepStartedAt: now.toISOString(), stuck: null, copiedAt: now.toISOString(), type: "ORDER" } as unknown as TrackingPipelineItem
  return { ...raw, sla: slaStatusOf(raw, parseStepSla({}), now) }
}

/** Điều phối mở "Theo dõi đơn" thấy ngay việc của mình thay vì cột khách đang lướt mẫu (16/10/2026). */
describe("Theo dõi đơn — mặc định cho Điều phối", () => {
  it("lọc mặc định chỉ giữ các bước Điều phối phụ trách: nhận đơn → đang giao", () => {
    const all = PIPELINE_STEPS.map((s) => item(s.id))
    const shown = filterAndSort(all, { owner: COORDINATOR_DEFAULT.owner || undefined }, { field: "urgency", dir: "desc" }).map((i) => i.currentStepId).sort()
    expect(shown).toEqual(["STEP_5_PAYMENT_CONFIRMED", "STEP_6_ARRANGING", "STEP_7_READY_QC", "STEP_8_DELIVERING"])
  })

  it("chỉ vai mở thẳng bảng Điều phối mới nhận mặc định này; Điều hành và Sale giữ nguyên", () => {
    const can = (codes: string[]) => (c: string) => codes.includes(c)
    expect(defaultTheChaoView(can(["R1", "R3", "R4", "R5"])).activeTab).toBe("coordinator")
    expect(defaultTheChaoView(can(["R1", "R4", "R11"])).activeTab).toBe("payment")
    // Sale mở chế độ Quản lý · tab Bán hàng, cùng giao diện với Điều hành (PO 16/10/2026)
    expect(defaultTheChaoView(can(["R1", "R2"])).activeTab).toBe("sales")
    expect(presetViews().some((v) => v.name === "Việc của Điều phối" && v.state.owner === "COORDINATOR")).toBe(true)
  })
})
