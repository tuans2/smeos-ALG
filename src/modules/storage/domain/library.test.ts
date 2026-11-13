import { describe, expect, it } from "vitest"

import { creatorFilterForScope, libraryOpenHref, parseLibraryScope, visibleLibraryTypes } from "./library"

const members = new Map<string, string | null>([
  ["owner", null],
  ["staff-a", "branch-a"],
  ["staff-b", "branch-b"],
])

describe("creatorFilterForScope", () => {
  it("toàn chuỗi: không lọc; trụ sở: loại người của chi nhánh; một chi nhánh: chỉ người của chi nhánh đó", () => {
    expect(creatorFilterForScope("all", members, null)).toEqual({ kind: "none" })
    expect(creatorFilterForScope("hq", members, null)).toEqual({
      kind: "exclude",
      userIds: ["staff-a", "staff-b"],
      includeUnknown: true,
    })
    expect(creatorFilterForScope({ branchId: "branch-a" }, members, null)).toEqual({ kind: "only", userIds: ["staff-a"] })
  })

  it("nhân viên chi nhánh luôn chỉ thấy chi nhánh mình + trụ sở, bỏ qua phạm vi gửi lên (L-3)", () => {
    const expected = { kind: "exclude", userIds: ["staff-b"], includeUnknown: true }
    expect(creatorFilterForScope("all", members, "branch-a")).toEqual(expected)
    expect(creatorFilterForScope({ branchId: "branch-b" }, members, "branch-a")).toEqual(expected)
  })
})

describe("libraryOpenHref", () => {
  it("mở đúng mục ở Creative Studio, loại khác mở trang công cụ", () => {
    expect(libraryOpenHref("ai_image", "a 1", "MASTER")).toBe("/creative-studio?area=d&assetId=a%201")
    expect(libraryOpenHref("video", "v1", null)).toBe("/creative-studio?area=e&videoJobId=v1")
    expect(libraryOpenHref("audio", "g1", "VOICE")).toBe("/creative-studio?area=c&voiceId=g1")
    expect(libraryOpenHref("catalog", "c1", null)).toBe("/catalog")
  })
})

describe("visibleLibraryTypes / parseLibraryScope", () => {
  it("chỉ hiện loại có quyền đọc của công cụ gốc", () => {
    expect(visibleLibraryTypes(new Set(["G1"]))).toEqual(["original", "ai_image"])
    expect(visibleLibraryTypes(new Set(["I1", "J1"]))).toEqual(["video", "audio", "content", "catalog", "landing"])
  })

  it("đọc phạm vi", () => {
    expect(parseLibraryScope(null)).toBe("all")
    expect(parseLibraryScope("hq")).toBe("hq")
    expect(parseLibraryScope("b1")).toEqual({ branchId: "b1" })
  })
})
