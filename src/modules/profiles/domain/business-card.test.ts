import { describe, expect, it } from "vitest"
import { BUSINESS_CARD_PRINT_PX, buildBusinessCard, buildVCard, displayUrl, type BusinessCardSource } from "./business-card"

const src: BusinessCardSource = {
  business: {
    display_name: "Cửa hàng An; Chi nhánh 1",
    phone: "0901 234 567",
    email: "lienhe@cuahang.vn",
    address: "12 Lê Lợi, Quận 1",
    website: "https://www.cuahang.vn/",
  },
  brand: { primary_color: "#2f6f4e", logo_url: "https://cdn.vi-du.test/logo.png" },
  shareUrl: "https://app.vi-du.test/ch/cua-hang-an-ab12c",
}

describe("buildBusinessCard", () => {
  it("dựng đủ dòng liên hệ, QR trỏ trang chia sẻ", () => {
    const c = buildBusinessCard(src)
    expect(c.lines.map((l) => l.kind)).toEqual(["PHONE", "EMAIL", "ADDRESS", "WEBSITE"])
    expect(c.lines[3]?.text).toBe("cuahang.vn")
    expect(c.qr).toEqual({ url: "https://app.vi-du.test/ch/cua-hang-an-ab12c", caption: "Quét để xem cửa hàng" })
    expect(c.blockers).toEqual([])
  })

  it("chưa có trang chia sẻ thì QR trỏ trang web; không có cả hai thì không có QR", () => {
    expect(buildBusinessCard({ ...src, shareUrl: null }).qr?.caption).toBe("Quét để vào trang web")
    expect(buildBusinessCard({ ...src, shareUrl: null, business: { ...src.business!, website: null } }).qr).toBeNull()
  })

  it("thiếu tên hoặc mọi cách liên hệ thì báo chặn, không điền mẫu", () => {
    const c = buildBusinessCard({ business: null, brand: null, shareUrl: null })
    expect(c.name).toBe("")
    expect(c.lines).toEqual([])
    expect(c.blockers).toEqual(["Tên cửa hàng", "Số điện thoại hoặc thư điện tử"])
  })

  it("bỏ số điện thoại sai và màu không hợp lệ; chặn link không an toàn", () => {
    const c = buildBusinessCard({
      business: { ...src.business!, phone: "abc", website: "javascript:alert(1)" },
      brand: { primary_color: "xanh", logo_url: null },
      shareUrl: "javascript:x",
    })
    expect(c.lines.map((l) => l.kind)).toEqual(["EMAIL", "ADDRESS"])
    expect(c.accentColor).toBeNull()
    expect(c.qr).toBeNull()
  })
})

describe("buildVCard", () => {
  it("đúng chuẩn 3.0: CRLF, thoát dấu ; và ,", () => {
    const v = buildVCard(buildBusinessCard(src))
    expect(v.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")).toBe(true)
    expect(v).toContain("FN:Cửa hàng An\\; Chi nhánh 1\r\n")
    expect(v).toContain("TEL;TYPE=WORK,VOICE:0901 234 567")
    expect(v).toContain("ADR;TYPE=WORK:;;12 Lê Lợi\\, Quận 1;;;;")
    expect(v).toContain("URL:https://www.cuahang.vn/")
    expect(v).toContain("URL;TYPE=STORE:https://app.vi-du.test/ch/cua-hang-an-ab12c")
    expect(v.endsWith("END:VCARD\r\n")).toBe(true)
  })
})

describe("khổ in", () => {
  it("90×54 mm ở 300 dpi", () => {
    expect(BUSINESS_CARD_PRINT_PX).toEqual({ width: 1063, height: 638 })
  })
  it("displayUrl gọn", () => {
    expect(displayUrl("http://www.a.vn/")).toBe("a.vn")
  })
})
