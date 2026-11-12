import { describe, expect, it } from "vitest"

import { defaultBomRows } from "../default-bom-rows"

const ROLES = [{ label: "Hoa chính" }, { label: "Hoa phụ" }, { label: "Lá đệm" }, { label: "Phụ kiện / Giấy gói" }]

describe("dòng công thức ban đầu của form Thêm sản phẩm", () => {
  it("ngành hoa: 3 dòng trống theo vai Hoa chính, Hoa phụ, Lá đệm — không có nguyên liệu mẫu", () => {
    const rows = defaultBomRows("FLORAL", ROLES, ["cành", "bó"], 10)
    expect(rows.map((r) => r.role)).toEqual(["Hoa chính", "Hoa phụ", "Lá đệm"])
    expect(rows.every((r) => r.name === "" && r.color === "")).toBe(true)
    expect(rows[0]?.quantity).toBe(10)
  })

  it("ngành khác: tối đa 2 dòng trống; không khai vai thì 1 dòng vai Chủ đạo", () => {
    expect(defaultBomRows("FASHION", ROLES, ["mét"], 2).every((r) => r.name === "")).toBe(true)
    expect(defaultBomRows("SERVICES", [], [], 1)).toEqual([{ id: "init-1", name: "", quantity: 1, unit: "cái", color: "", role: "Chủ đạo" }])
  })
})
