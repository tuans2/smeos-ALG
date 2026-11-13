import { describe, expect, it } from "vitest"
import {
  buildRedirectPath,
  detectDevice,
  generateShortLinkCode,
  isSafeTargetPath,
  isShortLinkCode,
  isShortLinkLive,
  referrerHost,
} from "../short-link-rules"

describe("isSafeTargetPath — chặn open redirect", () => {
  it.each(["/c/hoa-20-10", "/s/tiem-hoa?x=1", "/b/ABC#top"])("cho phép đường dẫn nội bộ %s", (p) => {
    expect(isSafeTargetPath(p)).toBe(true)
  })
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/javascript:alert(1)",
    "c/khong-co-gach",
    "/a\nb",
    "",
    `/${"a".repeat(600)}`,
  ])("từ chối %s", (p) => {
    expect(isSafeTargetPath(p)).toBe(false)
  })
})

describe("mã link", () => {
  it("sinh mã 7 ký tự trong bảng chữ an toàn và nhận diện lại được", () => {
    const code = generateShortLinkCode(new Uint8Array([0, 1, 2, 3, 250, 31, 32]))
    expect(code).toHaveLength(7)
    expect(isShortLinkCode(code)).toBe(true)
    expect(isShortLinkCode("abc")).toBe(false)
    expect(isShortLinkCode("ABCDEFG")).toBe(false)
  })
  it("thiếu byte ngẫu nhiên → lỗi", () => {
    expect(() => generateShortLinkCode(new Uint8Array(3))).toThrow()
  })
})

describe("isShortLinkLive", () => {
  const now = new Date("2026-10-30T00:00:00Z")
  it("tắt hoặc hết hạn → không dùng được", () => {
    expect(isShortLinkLive({ is_active: false, expires_at: null }, now)).toBe(false)
    expect(isShortLinkLive({ is_active: true, expires_at: new Date("2026-10-29T00:00:00Z") }, now)).toBe(false)
    expect(isShortLinkLive({ is_active: true, expires_at: new Date("2026-11-01T00:00:00Z") }, now)).toBe(true)
    expect(isShortLinkLive({ is_active: true, expires_at: null }, now)).toBe(true)
  })
})

it("buildRedirectPath giữ query cũ, gắn ref + UTM, không đổi sang tên miền khác", () => {
  const path = buildRedirectPath("/c/hoa?sort=new#top", "abc2345", { source: "smeos", medium: "qr", campaign: null })
  expect(path).toBe("/c/hoa?sort=new&ref=abc2345&utm_source=smeos&utm_medium=qr#top")
})

it("detectDevice / referrerHost", () => {
  expect(detectDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile")).toBe("MOBILE")
  expect(detectDevice("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("TABLET")
  expect(detectDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("DESKTOP")
  expect(detectDevice(null)).toBe("UNKNOWN")
  expect(referrerHost("https://www.facebook.com/some/path?fbclid=x")).toBe("www.facebook.com")
  expect(referrerHost("not a url")).toBeNull()
})
