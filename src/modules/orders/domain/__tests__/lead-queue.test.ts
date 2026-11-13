import { describe, expect, it } from "vitest"

import { leadHeat, leadSourceLabel, sessionHeat, sortLeadQueue, type LeadQueueItem } from "../lead-queue"

const item = (over: Partial<LeadQueueItem>): LeadQueueItem => ({
  key: over.id ?? "x", kind: "LEAD", id: "x", name: null, phone: null, sourceLabel: "", reasonLabel: "",
  heat: "WARM", status: "NEW", assigneeUserId: null, nextFollowUpAt: null, lastActivityAt: "2026-10-31T00:00:00.000Z", href: "/", ...over,
})

describe("hàng đợi lead chung", () => {
  it("mức nóng: quá hạn thanh toán / cần báo giá / đã chọn mẫu là nóng; chưa mở link là nguội", () => {
    expect(leadHeat("PAYMENT_TIMEOUT")).toBe("HOT")
    expect(leadHeat("QUOTE_REQUEST")).toBe("HOT")
    expect(leadHeat("CONTACT")).toBe("WARM")
    expect(sessionHeat("SELECTED")).toBe("HOT")
    expect(sessionHeat("OPENED")).toBe("WARM")
    expect(sessionHeat("CREATED")).toBe("COLD")
  })

  it("thứ tự: quá hạn gọi lại trước, rồi nóng, rồi hạn gần, rồi mới hoạt động", () => {
    const now = new Date("2026-10-31T10:00:00Z")
    const sorted = sortLeadQueue([
      item({ id: "cold", heat: "COLD" }),
      item({ id: "hot-new", heat: "HOT", lastActivityAt: "2026-10-31T09:00:00.000Z" }),
      item({ id: "hot-old", heat: "HOT", lastActivityAt: "2026-10-30T09:00:00.000Z" }),
      item({ id: "due", heat: "COLD", nextFollowUpAt: "2026-10-31T08:00:00.000Z" }),
    ], now)
    expect(sorted.map((i) => i.id)).toEqual(["due", "hot-new", "hot-old", "cold"])
  })

  it("nhãn nguồn là tiếng Việt", () => {
    expect(leadSourceLabel("CATALOG_LINK")).toBe("Bộ sưu tập chung")
    expect(leadSourceLabel("BROCHURE")).toBe("Bộ sưu tập riêng")
    expect(leadSourceLabel(null)).toBe("Khác")
  })
})
