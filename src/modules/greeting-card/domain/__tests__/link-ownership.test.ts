import { describe, expect, it } from "vitest"
import { linkFactsOf, pendingLinkTitle, resolveDefaultOwner } from "../link-ownership"

describe("link-ownership", () => {
  it("người phụ trách link cũ: người Điều hành chọn (còn trong tiệm), không thì chủ tiệm", () => {
    expect(resolveDefaultOwner("lan", ["chu", "lan"], "chu")).toBe("lan")
    expect(resolveDefaultOwner("da-nghi", ["chu", "lan"], "chu")).toBe("chu")
    expect(resolveDefaultOwner(null, ["chu"], "chu")).toBe("chu")
  })

  it("phân biệt link riêng / link sao chép / link cũ từ sự kiện của phiên", () => {
    const at = new Date("2026-10-06T08:00:00Z")
    expect(linkFactsOf({ sale_id: "lan", events: [{ event_type: "LINK_COPIED", created_at: at }] })).toEqual({ kind: "PERSONAL", copiedAt: at.toISOString(), shareChannel: null })
    expect(linkFactsOf({ sale_id: "lan", events: [{ event_type: "SHARE_OPEN", created_at: at, metadata: { channel: "zalo" } }] })).toMatchObject({ kind: "SHARED", shareChannel: "zalo" })
    expect(linkFactsOf({ sale_id: "public" }).kind).toBe("LEGACY")
  })

  it("trạng thái link chưa thành đơn", () => {
    expect(pendingLinkTitle({ status: "CREATED", copiedAt: null, kind: "PERSONAL" })).toContain("chưa sao chép")
    expect(pendingLinkTitle({ status: "CREATED", copiedAt: "x", kind: "PERSONAL" })).toBe("Đã gửi link — khách chưa mở")
    expect(pendingLinkTitle({ status: "SELECTED", copiedAt: null, kind: "SHARED" })).toContain("đã chọn mẫu")
  })
})
