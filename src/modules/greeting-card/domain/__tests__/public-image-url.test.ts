import { describe, it, expect } from "vitest"
import { isSafePublicImageUrl } from "../public-image-url"

/** Ảnh ghép link công khai không được dùng để gọi vào mạng nội bộ của máy chủ (SSRF). */
describe("isSafePublicImageUrl", () => {
  it("cho phép ảnh https qua tên miền công khai", () => {
    expect(isSafePublicImageUrl("https://cdn.example.com/hoa/1.jpg")).toBe(true)
    expect(isSafePublicImageUrl("https://lh3.googleusercontent.com/abc=w800")).toBe(true)
  })

  it("chặn http, localhost, IP nội bộ, metadata đám mây, cổng lạ, IP dạng số", () => {
    for (const u of [
      "http://cdn.example.com/a.jpg",
      "https://localhost/a.jpg",
      "https://169.254.169.254/latest/meta-data",
      "https://10.0.0.5/a.jpg",
      "https://192.168.1.1/a.jpg",
      "https://[::1]/a.jpg",
      "https://2130706433/a.jpg",
      "https://cdn.example.com:8443/a.jpg",
      "https://user:pass@cdn.example.com/a.jpg",
      "https://db.internal/a.jpg",
      "file:///etc/passwd",
      "không phải url",
    ]) {
      expect(isSafePublicImageUrl(u)).toBe(false)
    }
  })
})
