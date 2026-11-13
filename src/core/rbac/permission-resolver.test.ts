import { describe, expect, it } from "vitest"

import { applyHardCap, applyRoleFloor, breaksRoleFloor, mergeOverrides, passesHardCap } from "./permission-resolver"

describe("cổng năng lực — lớp ba, trần cứng cắt sau cùng", () => {
  it("mã không có trần cứng luôn qua được", () => {
    expect(passesHardCap("A1", "sale")).toBe(true)
    expect(passesHardCap("A1", "vai-tu-tao")).toBe(true)
  })

  it("mã có trần cứng chỉ qua được với vai nằm trong trần", () => {
    expect(passesHardCap("E4", "dieu_hanh")).toBe(true)
    expect(passesHardCap("E4", "dieu_phoi")).toBe(false)
    expect(passesHardCap("E4", "sale")).toBe(false)
  })

  it("vai riêng của tổ chức không bao giờ khớp một trần cứng — an toàn theo mặc định", () => {
    expect(passesHardCap("F5", "truong_phong_marketing")).toBe(false)
    expect(passesHardCap("H3", "quan_ly_khu_vuc")).toBe(false)
  })

  it("applyHardCap loại mã bị chặn dù đang bật ở switchboard", () => {
    const grants = new Map<string, "ORGANIZATION" | "BRANCH">([
      ["A1", "ORGANIZATION"],
      ["E4", "ORGANIZATION"], // bật nhầm cho Sale ở bảng công tắc — vẫn phải bị cắt
    ])
    const result = applyHardCap("sale", grants)
    expect(result.map((g) => g.code)).toEqual(["A1"])
  })

  it("applyHardCap giữ nguyên phạm vi (organization/branch) của từng mã", () => {
    const grants = new Map<string, "ORGANIZATION" | "BRANCH">([
      ["F6", "BRANCH"],
      ["F1", "ORGANIZATION"],
    ])
    const result = applyHardCap("sale", grants)
    expect(result).toEqual([
      { code: "F1", scope: "ORGANIZATION" },
      { code: "F6", scope: "BRANCH" },
    ])
  })

  it("mergeOverrides: allowed=true bật thêm một mã chưa có ở lớp một", () => {
    const base = new Map<string, "ORGANIZATION" | "BRANCH">([["A1", "ORGANIZATION"]])
    const merged = mergeOverrides(base, [{ capability_code: "B6", allowed: true }])
    expect([...merged.keys()].sort()).toEqual(["A1", "B6"])
  })

  it("mergeOverrides: allowed=false tắt một mã đang bật ở lớp một", () => {
    const base = new Map<string, "ORGANIZATION" | "BRANCH">([
      ["A1", "ORGANIZATION"],
      ["B6", "ORGANIZATION"],
    ])
    const merged = mergeOverrides(base, [{ capability_code: "B6", allowed: false }])
    expect([...merged.keys()]).toEqual(["A1"])
  })

  it("mergeOverrides không đụng vào mã không có ngoại lệ", () => {
    const base = new Map<string, "ORGANIZATION" | "BRANCH">([["A1", "ORGANIZATION"]])
    const merged = mergeOverrides(base, [])
    expect(merged).toEqual(base)
  })

  it("bật ngoại lệ cho một mã có trần cứng vẫn không mở được năng lực (`YC-Q3`)", () => {
    const base = new Map<string, "ORGANIZATION" | "BRANCH">()
    const merged = mergeOverrides(base, [{ capability_code: "E4", allowed: true }])
    expect(merged.has("E4")).toBe(true) // lớp hai đã bật...
    const afterHardCap = applyHardCap("sale", merged)
    expect(afterHardCap).toEqual([]) // ...nhưng lớp ba cắt sau cùng.
  })
})

describe("sàn của vai Điều hành", () => {
  it("không tắt được F1, F5 trên vai dieu_hanh; mã khác và vai khác thì được", () => {
    expect(breaksRoleFloor("F5", "dieu_hanh")).toBe(true)
    expect(breaksRoleFloor("F1", "dieu_hanh")).toBe(true)
    expect(breaksRoleFloor("A4", "dieu_hanh")).toBe(false)
    expect(breaksRoleFloor("F1", "dieu_phoi")).toBe(false)
    expect(breaksRoleFloor("F5", "vai-tu-tao")).toBe(false)
  })
})

describe("sàn của vai Điều hành lúc tính quyền", () => {
  it("ngoại lệ cũ tắt F5/F1 trên dieu_hanh vẫn bị sàn bật lại, giữ phạm vi lớp một; vai khác không đổi", () => {
    const base = new Map([["F1", "ORGANIZATION" as const], ["F5", "ORGANIZATION" as const], ["A4", "ORGANIZATION" as const]])
    const merged = mergeOverrides(base, [{ capability_code: "F5", allowed: false }, { capability_code: "F1", allowed: false }, { capability_code: "A4", allowed: false }])
    const owner = applyHardCap("dieu_hanh", applyRoleFloor("dieu_hanh", merged, base)).map((g) => g.code)
    expect(owner).toEqual(expect.arrayContaining(["F1", "F5"]))
    expect(owner).not.toContain("A4") // ngoài sàn: ngoại lệ vẫn có hiệu lực
    expect([...applyRoleFloor("dieu_phoi", merged, base).keys()]).not.toContain("F5")
  })
})

