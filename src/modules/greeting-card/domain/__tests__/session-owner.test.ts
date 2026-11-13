import { describe, expect, it } from "vitest"
import { decideViewer, otherViewerAction, ownerCookieName } from "../session-owner"
import { BROWSING_EVENT_TYPES, isCustomerJourneyEvent, journeyEventType } from "../customer-journey-events"

describe("session-owner", () => {
  it("cookie đúng chữ ký luôn là chủ phiên; nhân viên tiệm chỉ xem trước", () => {
    expect(decideViewer({ tokenValid: true, claimed: true, staffOfShop: false })).toBe("OWNER")
    expect(decideViewer({ tokenValid: false, claimed: true, staffOfShop: true })).toBe("STAFF")
  })

  it("phiên chưa có chủ thì xin nhận; đã có chủ khác thì là người ngoài", () => {
    expect(decideViewer({ tokenValid: false, claimed: false, staffOfShop: false })).toBe("UNCLAIMED")
    expect(decideViewer({ tokenValid: false, claimed: true, staffOfShop: false })).toBe("OTHER")
  })

  it("trình duyệt chặn cookie vừa được tạo phiên thì dừng, không chuyển lại tạo phiên mới (sự cố 140 phiên)", () => {
    expect(otherViewerAction({ hasOrder: false, shareCode: "ABCDEFGHJK", justCreated: true })).toBe("COOKIE_BLOCKED")
    // Người nhận link chuyển tiếp (không có dấu vừa tạo) vẫn được mở phiên riêng
    expect(otherViewerAction({ hasOrder: false, shareCode: "ABCDEFGHJK", justCreated: false })).toBe("REDIRECT_SHARE")
    expect(otherViewerAction({ hasOrder: true, shareCode: "ABCDEFGHJK", justCreated: true })).toBe("UNLOCK")
    expect(otherViewerAction({ hasOrder: false, shareCode: null, justCreated: false })).toBe("UNAVAILABLE")
  })

  it("tên cookie theo mã phiên, không phân biệt hoa thường", () => {
    expect(ownerCookieName("t01-abc")).toBe("fl_b_T01-ABC")
  })
})

describe("customer-journey-events", () => {
  it("chỉ nhận sự kiện trong danh sách; khách không tự báo đơn hoàn tất", () => {
    expect(isCustomerJourneyEvent("product_liked")).toBe(true)
    expect(isCustomerJourneyEvent("order_completed")).toBe(false)
    expect(isCustomerJourneyEvent("SUBMIT_ORDER")).toBe(false)
    expect(journeyEventType("contact_zalo_clicked")).toBe("CONTACT_ZALO_CLICKED")
  })

  it("dòng thời gian bỏ qua các bước lướt và mốc chủ phiên, giữ mốc nghiệp vụ", () => {
    expect(BROWSING_EVENT_TYPES).toContain("PRODUCT_VIEWED")
    expect(BROWSING_EVENT_TYPES).toContain("OWNER_CLAIMED")
    expect(BROWSING_EVENT_TYPES).not.toContain("SUBMIT_ORDER")
    expect(BROWSING_EVENT_TYPES).not.toContain("SELECT_PRODUCT")
  })
})
