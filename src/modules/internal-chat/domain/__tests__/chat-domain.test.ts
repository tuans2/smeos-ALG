import { describe, expect, it } from "vitest"
import { formatCardAddress } from "../card-address"
import { decodeMessageCursor, encodeMessageCursor } from "../message-cursor"

describe("con trỏ trang tin nhắn", () => {
  it("mã hoá rồi giải mã giữ nguyên mốc và id", () => {
    const cursor = { createdAt: new Date("2026-11-09T10:00:00.123Z"), id: "0b6f2c3e-1a2b-4c5d-8e9f-001122334455" }
    expect(decodeMessageCursor(encodeMessageCursor(cursor))).toEqual(cursor)
  })

  it("chuỗi hỏng → null", () => {
    for (const raw of ["", "abc", "2026-11-09T10:00:00Z~", "~0b6f2c3e", "khong-phai-ngay~0b6f2c3e-1a2b", "2026-11-09T10:00:00Z~<script>"]) {
      expect(decodeMessageCursor(raw)).toBeNull()
    }
  })
})

describe("địa chỉ trên thẻ đơn", () => {
  it("ghép các phần thành chữ, không phải JSON", () => {
    expect(formatCardAddress({ recipientName: "An", phone: "0900000000", street: "12 Lê Lợi", ward: "Phường Bến Nghé", province: "TP Hồ Chí Minh" })).toBe(
      "12 Lê Lợi, Phường Bến Nghé, TP Hồ Chí Minh"
    )
  })

  it("không lặp phần đã có sẵn trong dòng địa chỉ ghép, không lộ SĐT", () => {
    const text = formatCardAddress({ phone: "0900000000", street: "12 Lê Lợi, Phường Bến Nghé, TP Hồ Chí Minh", ward: "Phường Bến Nghé" })
    expect(text).toBe("12 Lê Lợi, Phường Bến Nghé, TP Hồ Chí Minh")
    expect(text).not.toContain("0900000000")
  })

  it("chuỗi giữ nguyên; trống → undefined", () => {
    expect(formatCardAddress(" 5 Hai Bà Trưng ")).toBe("5 Hai Bà Trưng")
    expect(formatCardAddress(null)).toBeUndefined()
    expect(formatCardAddress({ phone: "0900000000" })).toBeUndefined()
  })
})
