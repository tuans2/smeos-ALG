import { describe, expect, it, vi } from "vitest"

import { remindCollectDue } from "../remind-collect-due"
import { collectDueReminderReason, COLLECT_DUE_REMINDER_REASONS } from "../../domain/collect-due-reminder"

const row = (orderId: string, owner: string | null, reminded = 0) => ({
  organization_id: "org-1", requested_by: "sale-req", collect_due_at: new Date("2026-10-30T00:00:00Z"),
  order: { id: orderId, code: `DH-${orderId}`, status: "DELIVERED", balance_vnd: 500_000, owner_sale_id: owner, events: Array.from({ length: reminded }, (_, i) => ({ id: `e${i}` })) },
})

describe("nhắc thu tiền đơn giao trước quá hạn", () => {
  it("nhắc Sale phụ trách (hoặc người xin), đánh dấu trước khi gửi", async () => {
    const repo = { listOverdue: vi.fn(async () => [row("a", "sale-1"), row("b", null)]), markReminded: vi.fn(async () => undefined) }
    const notify = vi.fn(async () => 1)
    const r = await remindCollectDue(new Date(), repo as never, notify)
    expect(r).toEqual({ scanned: 2, reminded: 2, escalated: 0 })
    expect(repo.markReminded).toHaveBeenCalledWith("org-1", "a", "DELIVERED", 1)
    expect(notify.mock.calls.map((c) => (c as unknown as [{ ownerUserId: string }])[0].ownerUserId)).toEqual(["sale-1", "sale-req"])
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ eventKey: "ORDER_COLLECT_DUE", deepLink: "/don-hang?tab=sale" }))
  })

  // PO 12/11/2026 (audit BL-29): nhắc lặp tối đa 3 lần, lần 3 báo thêm Điều hành
  it("lần nhắc thứ 3 ghi đúng lần và báo thêm Điều hành mức khẩn", async () => {
    const repo = { listOverdue: vi.fn(async () => [row("a", "sale-1", 1), row("b", "sale-2", 2)]), markReminded: vi.fn(async () => undefined) }
    const notify = vi.fn(async () => 1)
    expect(await remindCollectDue(new Date(), repo as never, notify)).toEqual({ scanned: 2, reminded: 2, escalated: 1 })
    expect(repo.markReminded.mock.calls.map((c) => (c as unknown[])[3])).toEqual([2, 3])
    const keys = notify.mock.calls.map((c) => (c as unknown as [{ eventKey: string }])[0].eventKey)
    expect(keys).toEqual(["ORDER_COLLECT_DUE", "ORDER_COLLECT_DUE", "ORDER_COLLECT_DUE_ESCALATED"])
  })

  it("lý do lần 1 giữ chuỗi cũ — đơn đã nhắc trước bản sửa được tính là đã nhắc 1 lần", () => {
    expect(collectDueReminderReason(1)).toBe("Nhắc thu tiền: đã quá hạn thu sau khi giao trước")
    expect(COLLECT_DUE_REMINDER_REASONS).toHaveLength(3)
    expect(new Set(COLLECT_DUE_REMINDER_REASONS).size).toBe(3)
  })
})
