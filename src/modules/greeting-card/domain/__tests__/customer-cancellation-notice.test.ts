import { describe, it, expect } from "vitest"
import { customerCancellationNotice } from "../customer-cancellation-notice"

const approved = (over: Record<string, unknown> = {}) => ({
  status: "APPROVED",
  type: "FULL_REFUND",
  decidedAt: "2026-10-16T07:30:00.000Z",
  followUp: { status: "PENDING", refundDueVnd: 450_000 },
  ...over,
})

/** Điều phối không nhận đơn / huỷ giữa chừng, đã được duyệt → khách thấy thông báo trên thẻ chào. */
describe("customerCancellationNotice", () => {
  it("hạn liên hệ = lúc duyệt huỷ + 2 tiếng, kèm số tiền hoàn", () => {
    expect(customerCancellationNotice([{ senderRole: "COORDINATOR", payload: approved() }])).toEqual({
      cancelledAt: "2026-10-16T07:30:00.000Z",
      contactDeadline: "2026-10-16T09:30:00.000Z",
      refundVnd: 450_000,
    })
  })

  it("huỷ không hoàn tiền (chưa trả hoặc trả rồi nhưng không hoàn) → refundVnd = 0", () => {
    const cancelOnly = approved({ type: "CANCEL_ONLY", followUp: undefined })
    expect(customerCancellationNotice([{ senderRole: "COORDINATOR", payload: cancelOnly }])?.refundVnd).toBe(0)
    // Hệ thống tự duyệt đơn chưa trả: có việc theo dõi nhưng không có tiền hoàn
    const autoNoMoney = approved({ type: "CANCEL_ONLY", autoApproved: true, followUp: { status: "PENDING", refundDueVnd: 0 } })
    expect(customerCancellationNotice([{ senderRole: "COORDINATOR", payload: autoNoMoney }])?.refundVnd).toBe(0)
  })

  it("không thông báo khi đề xuất chưa duyệt / bị từ chối / chỉ hoàn một phần / do Sale đề xuất", () => {
    expect(customerCancellationNotice([{ senderRole: "COORDINATOR", payload: approved({ status: "PENDING" }) }])).toBeNull()
    expect(customerCancellationNotice([{ senderRole: "COORDINATOR", payload: approved({ status: "REJECTED" }) }])).toBeNull()
    expect(customerCancellationNotice([{ senderRole: "COORDINATOR", payload: approved({ type: "PARTIAL_REFUND" }) }])).toBeNull()
    expect(customerCancellationNotice([{ senderRole: "SALE", payload: approved() }])).toBeNull()
    expect(customerCancellationNotice([{ senderRole: "COORDINATOR", payload: approved({ decidedAt: "x" }) }])).toBeNull()
    expect(customerCancellationNotice([])).toBeNull()
  })

  it("bỏ qua đề xuất bị từ chối trước đó, lấy đề xuất đã duyệt", () => {
    const notice = customerCancellationNotice([
      { senderRole: "COORDINATOR", payload: approved({ status: "REJECTED" }) },
      { senderRole: "COORDINATOR", payload: approved({ type: "CANCEL_ONLY", followUp: undefined }) },
    ])
    expect(notice?.refundVnd).toBe(0)
  })
})
