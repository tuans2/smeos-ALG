import { describe, expect, it } from "vitest"
import { customerOrderStatusLabel, familyResumeTarget, showOrderHistory, type FamilyMember } from "../order-family"

const order = (o: Partial<NonNullable<FamilyMember["order"]>> = {}): FamilyMember["order"] => ({
  code: "DH1", status: "CONFIRMED", deliveryStatus: "PENDING", totalVnd: 500_000, paidVnd: 500_000, deliveryDate: null, ...o,
})
const m = (sendCode: string, createdAt: string, extra: Partial<FamilyMember> = {}): FamilyMember => ({
  sendCode, createdAt, available: true, productName: null, order: null, ...extra,
})

const done = m("SL-AAAA0001", "2026-10-01T00:00:00Z", { order: order({ status: "COMPLETED", deliveryStatus: "DELIVERED" }) })
const draft = m("SL-AAAA0002", "2026-10-02T00:00:00Z")

describe("familyResumeTarget — mở lại link thì về đúng đơn đang làm dở", () => {
  // Lỗi khách gặp: đặt thêm đơn rồi mở lại link cũ → về màn Hoàn thành của đơn 1
  it("mở link đơn 1 (đã xong), máy chưa nhớ gì → về đơn mới nhất đang đặt dở", () => {
    expect(familyResumeTarget([done, draft], done.sendCode, null)).toBe(draft.sendCode)
  })

  it("lần trước khách đứng ở đơn 1 (xem lại từ Lịch sử) → ở yên đơn 1", () => {
    expect(familyResumeTarget([done, draft], done.sendCode, done.sendCode)).toBeNull()
  })

  it("mở link đơn 2 trong khi chỗ đứng đã nhớ là đơn 1 → về đơn 1", () => {
    expect(familyResumeTarget([done, draft], draft.sendCode, done.sendCode)).toBe(done.sendCode)
  })

  it("chỗ đứng đã nhớ không còn mở được / không thuộc nhóm → về đơn mới nhất còn mở được", () => {
    const expired = { ...draft, available: false }
    expect(familyResumeTarget([done, expired], done.sendCode, expired.sendCode)).toBeNull()
    expect(familyResumeTarget([done, draft], done.sendCode, "SL-KHAC0001")).toBe(draft.sendCode)
  })

  it("chỉ một đơn → không chuyển", () => {
    expect(familyResumeTarget([done], done.sendCode, null)).toBeNull()
  })
})

describe("showOrderHistory / customerOrderStatusLabel", () => {
  it("hiện Lịch sử khi đã bắt đầu đơn thứ hai (kể cả đang đặt dở)", () => {
    expect(showOrderHistory([done])).toBe(false)
    expect(showOrderHistory([done, draft])).toBe(true)
    expect(showOrderHistory([draft, { ...draft, sendCode: "SL-AAAA0003" }])).toBe(false)
  })

  it("trạng thái bằng lời cho khách", () => {
    expect(customerOrderStatusLabel(draft)).toMatch(/chưa gửi đơn/)
    expect(customerOrderStatusLabel(done)).toBe("Đã giao")
    expect(customerOrderStatusLabel({ order: order({ status: "CANCELLED" }) })).toBe("Đã huỷ")
    expect(customerOrderStatusLabel({ order: order({ totalVnd: 0, paidVnd: 0 }) })).toBe("Chờ cửa hàng báo giá")
    expect(customerOrderStatusLabel({ order: order({ status: "DRAFT", paidVnd: 0 }) })).toBe("Chờ thanh toán")
    expect(customerOrderStatusLabel({ order: order({ paidVnd: 200_000 }) })).toMatch(/Đã đặt cọc/)
    expect(customerOrderStatusLabel({ order: order({ deliveryStatus: "DELIVERING" }) })).toBe("Đang giao")
  })
})
