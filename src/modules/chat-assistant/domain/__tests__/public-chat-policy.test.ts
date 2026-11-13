import { describe, expect, it } from "vitest"
import {
  DEFAULT_PUBLIC_CHAT_LIMITS,
  PUBLIC_CHAT_LIMIT_CEILING,
  isPublicChatSurface,
  isSurfaceAllowed,
  resolvePublicChatLimits,
  surfaceChannel,
  surfacesOfChannel,
  toggleSurface,
} from "../public-chat-policy"

describe("public chat policy", () => {
  it("landing page tính vào kênh LANDING_PAGE, các trang khác vào STOREFRONT_CATALOG", () => {
    expect(surfaceChannel("landing_page")).toBe("LANDING_PAGE")
    expect(surfaceChannel("catalog")).toBe("STOREFRONT_CATALOG")
    expect(surfaceChannel("business_card")).toBe("STOREFRONT_CATALOG")
  })

  it("nhận diện trang hợp lệ", () => {
    expect(isPublicChatSurface("sales_link")).toBe(true)
    expect(isPublicChatSurface("website_ngoai")).toBe(false)
  })

  it("chưa cài đặt thì mọi trang đều bật; đã cài thì chỉ trang được chọn", () => {
    expect(isSurfaceAllowed(undefined, "catalog")).toBe(true)
    expect(isSurfaceAllowed({}, "store_profile")).toBe(true)
    expect(isSurfaceAllowed({ publicSurfaces: ["catalog"] }, "catalog")).toBe(true)
    expect(isSurfaceAllowed({ publicSurfaces: ["catalog"] }, "landing_page")).toBe(false)
    expect(isSurfaceAllowed({ publicSurfaces: [] }, "catalog")).toBe(false)
  })

  it("mặc định 20 tin/khách, 60 tin/IP mỗi 10 phút", () => {
    expect(resolvePublicChatLimits(undefined)).toEqual({ perVisitor: 20, perIp: 60, windowMs: 600_000 })
  })

  it("hạn mức nâng chưa được duyệt thì bỏ qua", () => {
    const config = { publicChatLimits: { perVisitor: 100, perIp: 300, approvedAt: "" } }
    expect(resolvePublicChatLimits(config)).toEqual(DEFAULT_PUBLIC_CHAT_LIMITS)
  })

  it("hạn mức đã duyệt được áp dụng nhưng không vượt trần", () => {
    const ok = { publicChatLimits: { perVisitor: 50, perIp: 150, approvedAt: "2026-10-31" } }
    expect(resolvePublicChatLimits(ok)).toMatchObject({ perVisitor: 50, perIp: 150 })
    const huge = { publicChatLimits: { perVisitor: 99_999, perIp: 99_999, approvedAt: "2026-10-31" } }
    expect(resolvePublicChatLimits(huge)).toMatchObject(PUBLIC_CHAT_LIMIT_CEILING)
    const bad = { publicChatLimits: { perVisitor: -1, perIp: 1.5, approvedAt: "2026-10-31" } }
    expect(resolvePublicChatLimits(bad)).toMatchObject({ perVisitor: 20, perIp: 60 })
  })
})

describe("toggleSurface", () => {
  it("tắt một trang khi chưa cài đặt → giữ các trang còn lại của cùng kênh", () => {
    expect(toggleSurface(undefined, "catalog", false)).toEqual([
      "store_profile",
      "sales_link",
      "greeting_catalog",
      "business_card",
    ])
  })

  it("bật lại trang đã tắt", () => {
    expect(toggleSurface({ publicSurfaces: ["store_profile"] }, "catalog", true)).toEqual(["catalog", "store_profile"])
  })

  it("landing page là kênh riêng — chỉ chứa chính nó", () => {
    expect(surfacesOfChannel("LANDING_PAGE")).toEqual(["landing_page"])
    expect(toggleSurface(undefined, "landing_page", false)).toEqual([])
  })
})
