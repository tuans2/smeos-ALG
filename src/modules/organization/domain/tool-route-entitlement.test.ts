import { describe, expect, it } from "vitest"
import { lockedToolForPath, toolForPath, unlockedToolsFrom } from "./tool-route-entitlement"

describe("tool-route-entitlement", () => {
  it("nhận diện trang và API riêng của công cụ", () => {
    expect(toolForPath("/video")).toBe("video")
    expect(toolForPath("/api/v1/video/jobs/1")).toBe("video")
    expect(toolForPath("/api/v1/creative-production/plan")).toBe("creative-studio")
    expect(toolForPath("/cong-cu/toi-uu-he-thong")).toBe("system-optimizer")
  })

  it("không nhầm tiền tố và luôn mở thư viện công cụ", () => {
    expect(toolForPath("/videos-khac")).toBeNull()
    expect(toolForPath("/cong-cu")).toBeNull()
    expect(toolForPath("/api/v1/products")).toBeNull()
  })

  it("null = không giới hạn; mảng (kể cả rỗng) = chỉ công cụ có trong mảng", () => {
    expect(lockedToolForPath("/video", null)).toBeNull()
    expect(lockedToolForPath("/video", [])).toBe("video")
    expect(lockedToolForPath("/api/v1/audio/x", ["catalog"])).toBe("video")
    expect(lockedToolForPath("/video", ["video"])).toBeNull()
    expect(lockedToolForPath("/don-hang", [])).toBeNull()
  })

  it("đọc settings an toàn", () => {
    expect(unlockedToolsFrom(null)).toBeNull()
    expect(unlockedToolsFrom({ unlocked_tools: "video" })).toBeNull()
    expect(unlockedToolsFrom({ unlocked_tools: ["video", 3] })).toEqual(["video"])
  })
})
