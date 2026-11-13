import { describe, expect, it } from "vitest"
import { parseStepSla } from "@/modules/greeting-card/domain/step-sla"
import { kanbanColumns, slaStatusOf, type TrackingViewItem } from "@/modules/greeting-card/domain/tracking-views"
import type { TrackingPipelineItem } from "@/modules/greeting-card/domain/tracking-pipeline-types"
import { parseTrackingQuery } from "@/modules/greeting-card/contracts/tracking-query"

const now = new Date("2026-10-16T03:00:00Z")
const sla = parseStepSla({})

function session(id: string, stuck: boolean): TrackingViewItem {
  const raw = {
    id, type: "SESSION", orderId: null, sessionId: id, orderCode: null, sendCode: `SL-${id}`, catalogName: "B", customerName: null,
    customerPhone: null, saleName: "Hà Trang", productName: null, productPrice: null, totalVnd: 0, paidVnd: 0, balanceVnd: 0,
    currentStepId: "STEP_2_CHOOSING", currentStepTitle: "", stepStartedAt: now.toISOString(), saleId: "u1", channel: "Zalo",
    stuck: stuck ? { stepId: "STEP_2_CHOOSING", owner: "SALE", overdueMinutes: 5, message: "" } : null,
    linkKind: "SHARED", copiedAt: null, expiresAt: null, steps: [], lastActiveAt: now.toISOString(), createdAt: now.toISOString(), deliveryDate: null,
  } as unknown as TrackingPipelineItem
  return { ...raw, sla: slaStatusOf(raw, sla, now) }
}

/** Cột Kanban có 144 thẻ chỉ hiện 20, kèm "Còn 124 — xem ở Danh sách", và đếm "20 quá hạn" sai (16/10/2026). */
describe("Kanban — nút Xem thêm theo cột", () => {
  const items = Array.from({ length: 45 }, (_, i) => session(`s${i}`, i < 30))

  it("mặc định 20 thẻ; cột được mở thêm trả đúng số thẻ đã xin, cột khác giữ nguyên", () => {
    const base = kanbanColumns(items, 20, {}, now.getTime()).find((c) => c.stepId === "STEP_2_CHOOSING")!
    expect(base).toMatchObject({ count: 45, hasMore: true })
    expect(base.items).toHaveLength(20)
    const more = kanbanColumns(items, 20, { STEP_2_CHOOSING: 40 }, now.getTime()).find((c) => c.stepId === "STEP_2_CHOOSING")!
    expect(more.items).toHaveLength(40)
    const all = kanbanColumns(items, 20, { STEP_2_CHOOSING: 60 }, now.getTime()).find((c) => c.stepId === "STEP_2_CHOOSING")!
    expect(all).toMatchObject({ hasMore: false })
    expect(all.items).toHaveLength(45)
  })

  it("số quá hạn ở tiêu đề tính trên cả cột, không chỉ 20 thẻ đang hiện", () => {
    const col = kanbanColumns(items, 20, {}, now.getTime()).find((c) => c.stepId === "STEP_2_CHOOSING")!
    expect(col.tierOverdue).toBe(30)
  })

  it("tham số expand: nhận STEP:n, từ chối bước lạ hoặc số ngoài khoảng", () => {
    const url = (q: string) => new URL(`http://x/api/v1/greeting-card/tracking?view=kanban&${q}`)
    expect(parseTrackingQuery(url("expand=STEP_2_CHOOSING:40,STEP_6_ARRANGING:60")).columnLimits).toEqual({ STEP_2_CHOOSING: 40, STEP_6_ARRANGING: 60 })
    expect(() => parseTrackingQuery(url("expand=STEP_X:40"))).toThrow()
    expect(() => parseTrackingQuery(url("expand=STEP_2_CHOOSING:0"))).toThrow()
    expect(() => parseTrackingQuery(url("expand=STEP_2_CHOOSING:5000"))).toThrow()
  })
})
