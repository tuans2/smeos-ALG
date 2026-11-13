import { describe, expect, it } from "vitest"
import { parseStepSla } from "../step-sla"
import { calendarDays, dashboardOf, filterAndSort, kanbanColumns, paginate, slaStatusOf, type TrackingViewItem } from "../tracking-views"
import { stepSegments, type TimelineEvent } from "../tracking-timeline"
import type { TrackingPipelineItem } from "../tracking-pipeline-types"

const now = new Date("2026-10-06T10:00:00Z")
const ago = (m: number) => new Date(now.getTime() - m * 60_000).toISOString()
const sla = parseStepSla({})

function item(over: Partial<TrackingPipelineItem>): TrackingViewItem {
  const raw = {
    id: "o1", type: "ORDER", orderId: "o1", sessionId: "s1", orderCode: "DH1", sendCode: "T01-A", catalogName: "B", customerName: "An",
    customerPhone: "0900000000", saleName: "Lan", productName: "Bó", productPrice: 1, totalVnd: 100, paidVnd: 0, balanceVnd: 100,
    currentStepId: "STEP_3_FILLING_FORM", currentStepTitle: "", stepStartedAt: ago(5), stuck: null, saleId: "u1", channel: "Zalo",
    linkKind: "PERSONAL", copiedAt: ago(60), expiresAt: null, steps: [], lastActiveAt: ago(1), createdAt: ago(5), deliveryDate: "2026-10-08",
    ...over,
  } as TrackingPipelineItem
  return { ...raw, sla: slaStatusOf(raw, sla, now) }
}

describe("slaStatusOf", () => {
  it("đúng hạn / sắp quá hạn / quá hạn theo thời gian chuẩn của bước (bước 3 = 15 phút)", () => {
    expect(item({}).sla).toMatchObject({ state: "ON_TRACK", minutes: 15, ageMinutes: 5, owner: "SALE" })
    expect(item({ stepStartedAt: ago(13) }).sla.state).toBe("DUE_SOON")
    expect(item({ stepStartedAt: ago(40), stuck: { stepId: "STEP_3_FILLING_FORM", owner: "SALE", overdueMinutes: 25, message: "" } }).sla.state).toBe("OVERDUE")
  })
  it("link riêng chưa gửi khách không tính giờ", () => {
    expect(item({ type: "SESSION", currentStepId: "STEP_1_OPENED", copiedAt: null, stepStartedAt: ago(500) }).sla.state).toBe("NONE")
  })
})

describe("các view trên cùng tập", () => {
  const items = [
    item({ id: "a", totalVnd: 300 }),
    item({ id: "b", currentStepId: "STEP_6_ARRANGING", stepStartedAt: ago(130), stuck: { stepId: "STEP_6_ARRANGING", owner: "COORDINATOR", overdueMinutes: 10, message: "" }, deliveryDate: "2026-10-07", deliveryTimeSlot: "Buổi chiều (13h - 17h)" }),
    item({ id: "c", type: "SESSION", orderId: null, orderCode: null, currentStepId: "STEP_2_CHOOSING", deliveryDate: null }),
  ]
  it("lọc + sắp xếp theo độ gấp, phân trang có con trỏ", () => {
    expect(filterAndSort(items, {}, { field: "urgency", dir: "desc" }).map((i) => i.id)[0]).toBe("b")
    expect(filterAndSort(items, { sla: "ATTENTION" }, { field: "urgency", dir: "desc" }).map((i) => i.id)).toEqual(["b"])
    expect(filterAndSort(items, { q: "dh1", type: "ORDER" }, { field: "totalVnd", dir: "desc" }).map((i) => i.id)).toEqual(["a", "b"])
    const p = paginate(items, 2)
    expect(p).toMatchObject({ next_cursor: "2", total: 3 })
    expect(paginate(items, 2, p.next_cursor!).data).toHaveLength(1)
  })
  it("tìm kiếm theo tên khách, mã đơn (có/không #), mã link, SĐT (dạng thô/số)", () => {
    const list = [
      item({ id: "1", orderCode: "DH-88", customerName: "Nguyễn Thu Hà", customerPhone: "0912.345.678" }),
      item({ id: "2", orderCode: "DH-99", sendCode: "T02-XYZ", customerName: "Trần Minh", customerPhone: "0988000111", recipientName: "Lê Thu", recipientPhone: "0933444555" }),
    ]
    expect(filterAndSort(list, { q: "Thu Hà" }, { field: "urgency", dir: "desc" }).map((i) => i.id)).toEqual(["1"])
    expect(filterAndSort(list, { q: "#DH-88" }, { field: "urgency", dir: "desc" }).map((i) => i.id)).toEqual(["1"])
    expect(filterAndSort(list, { q: "dh-88" }, { field: "urgency", dir: "desc" }).map((i) => i.id)).toEqual(["1"])
    expect(filterAndSort(list, { q: "T02-XYZ" }, { field: "urgency", dir: "desc" }).map((i) => i.id)).toEqual(["2"])
    expect(filterAndSort(list, { q: "0912345678" }, { field: "urgency", dir: "desc" }).map((i) => i.id)).toEqual(["1"])
    expect(filterAndSort(list, { q: "345678" }, { field: "urgency", dir: "desc" }).map((i) => i.id)).toEqual(["1"])
    expect(filterAndSort(list, { q: "Lê Thu" }, { field: "urgency", dir: "desc" }).map((i) => i.id)).toEqual(["2"])
    expect(filterAndSort(list, { q: "0933444555" }, { field: "urgency", dir: "desc" }).map((i) => i.id)).toEqual(["2"])
    expect(filterAndSort(list, { q: "không_tồn_tại" }, { field: "urgency", dir: "desc" })).toHaveLength(0)
  })
  it("Kanban đủ 9 cột, đếm đúng; Lịch theo ngày + khung giờ; Dashboard tổng hợp", () => {
    const cols = kanbanColumns(items, 1)
    expect(cols).toHaveLength(9)
    expect(cols.find((c) => c.stepId === "STEP_6_ARRANGING")).toMatchObject({ count: 1, overdue: 1, maxAgeMinutes: 130 })
    expect(calendarDays(items, "2026-10-07", "2026-10-08").map((d) => [d.date, d.count])).toEqual([["2026-10-07", 1], ["2026-10-08", 1]])
    const d = dashboardOf(items)
    expect(d).toMatchObject({ total: 3, orders: 2, links: 1, overdue: 1 })
    expect(d.byOwner.find((o) => o.owner === "COORDINATOR")?.overdue).toBe(1)
    expect(d.aging.reduce((s, b) => s + b.count, 0)).toBe(3)
  })
})

describe("stepSegments", () => {
  const ev = (kind: string, at: string, entersStep: TimelineEvent["entersStep"]): TimelineEvent => ({ kind, at, label: kind, entersStep, actorId: null, note: null })
  it("chỉ tiến, đoạn cuối đến hiện tại, so với thời gian chuẩn", () => {
    const segs = stepSegments([
      ev("LINK_CREATED", ago(100), "STEP_1_OPENED"),
      ev("OPEN", ago(90), "STEP_2_CHOOSING"),
      ev("LINK_COPIED", ago(85), "STEP_1_OPENED"), // lùi bước → bỏ qua
      ev("SUBMIT_ORDER", ago(40), "STEP_3_FILLING_FORM"),
    ], sla, now)
    expect(segs.map((s) => [s.stepId, s.durationMinutes, s.overMinutes])).toEqual([
      ["STEP_1_OPENED", 10, 5], ["STEP_2_CHOOSING", 50, 20], ["STEP_3_FILLING_FORM", 40, 25],
    ])
  })
})
