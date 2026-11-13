import { describe, expect, it } from "vitest"
import { deliveryNoteErrors, deliveryNoteFields, normalizeMapUrl, readDeliveryNote } from "../delivery-note"

describe("normalizeMapUrl", () => {
  it("nhận link chia sẻ Google Maps phổ biến", () => {
    expect(normalizeMapUrl("https://maps.app.goo.gl/AbC123xyz")).toBe("https://maps.app.goo.gl/AbC123xyz")
    expect(normalizeMapUrl(" https://www.google.com/maps/place/Ch%E1%BB%A3+B%E1%BA%BFn+Th%C3%A0nh ")).toMatch(/^https:\/\/www\.google\.com\/maps\//)
    expect(normalizeMapUrl("https://goo.gl/maps/xyz")).toBe("https://goo.gl/maps/xyz")
    expect(normalizeMapUrl("https://maps.google.com/?q=10.77,106.70")).toBe("https://maps.google.com/?q=10.77,106.70")
  })

  it("từ chối trang lạ, http, javascript: và đường dẫn không phải bản đồ trên host dùng chung", () => {
    expect(normalizeMapUrl("https://example.com/maps")).toBeNull()
    expect(normalizeMapUrl("http://maps.app.goo.gl/abc")).toBeNull()
    expect(normalizeMapUrl("javascript:alert(1)")).toBeNull()
    expect(normalizeMapUrl("https://www.google.com/search?q=hoa")).toBeNull()
    expect(normalizeMapUrl("https://goo.gl/abc")).toBeNull()
    expect(normalizeMapUrl("https://maps.google.com.evil.io/x")).toBeNull()
    expect(normalizeMapUrl("https://user:pw@maps.google.com/x")).toBeNull()
    expect(normalizeMapUrl("không phải link")).toBeNull()
    expect(normalizeMapUrl("")).toBeNull()
  })
})

describe("deliveryNoteErrors / deliveryNoteFields", () => {
  it("bỏ trống là hợp lệ và không thêm khoá nào vào địa chỉ", () => {
    expect(deliveryNoteErrors({})).toEqual({})
    expect(deliveryNoteFields({ deliveryNote: "  ", mapUrl: "" })).toEqual({})
  })

  it("lưu ghi chú đã cắt khoảng trắng và link đã chuẩn hoá", () => {
    expect(deliveryNoteFields({ deliveryNote: " Gọi trước 15 phút ", mapUrl: "https://maps.app.goo.gl/abc" })).toEqual({
      notes: "Gọi trước 15 phút",
      mapUrl: "https://maps.app.goo.gl/abc",
    })
  })

  it("không lưu link sai dù client gửi lên", () => {
    expect(deliveryNoteFields({ mapUrl: "https://evil.example" })).toEqual({})
    expect(deliveryNoteErrors({ mapUrl: "https://evil.example" }).mapUrl).toBeDefined()
  })
})

describe("readDeliveryNote", () => {
  it("đọc dữ liệu đã lưu, bỏ link không hợp lệ, dữ liệu cũ trả null", () => {
    expect(readDeliveryNote({ notes: "Gửi bảo vệ", mapUrl: "https://maps.app.goo.gl/x" })).toEqual({ note: "Gửi bảo vệ", mapUrl: "https://maps.app.goo.gl/x" })
    expect(readDeliveryNote({ mapUrl: "javascript:alert(1)" })).toEqual({ note: null, mapUrl: null })
    expect(readDeliveryNote(null)).toEqual({ note: null, mapUrl: null })
  })
})
