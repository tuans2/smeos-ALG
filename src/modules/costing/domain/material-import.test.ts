import { describe, expect, it } from "vitest"
import { FLORAL_INDUSTRY } from "@/modules/organization/domain/industries/floral"
import type { IndustryCostingSpec } from "@/modules/organization/domain/industry-costing-spec"
import { parseMaterialTable } from "./material-import"

const spec = FLORAL_INDUSTRY.costing as IndustryCostingSpec

describe("parseMaterialTable (#32 nhập từ Excel)", () => {
  it("đọc bảng dán từ Excel: bỏ dòng tiêu đề, nhóm ghi không dấu, đơn giá có dấu chấm nghìn", () => {
    const text = "Tên\tNhóm\tĐơn vị\tĐơn giá\nHoa hồng\tHoa chinh\tcành\t12.000\nLá bạc\t\t\t\n"
    const r = parseMaterialTable(text, spec, "FOLIAGE")
    expect(r.rows).toEqual([
      { name: "Hoa hồng", unit: "cành", categoryKey: "MAIN_FLOWER", unitCostVnd: 12_000 },
      { name: "Lá bạc", unit: spec.materialCategories.find((c) => c.key === "FOLIAGE")?.defaultUnit, categoryKey: "FOLIAGE", unitCostVnd: null },
    ])
    expect(r.skipped).toEqual([])
  })

  it("báo dòng lỗi bằng lời, không đoán: trùng tên, giá sai", () => {
    const r = parseMaterialTable("Hoa cúc;;cành;abc\nHoa ly;;;5000\nhoa LY;;;6000\n;;;", spec, "SECONDARY_FLOWER")
    expect(r.rows).toEqual([{ name: "Hoa ly", unit: "cành", categoryKey: "SECONDARY_FLOWER", unitCostVnd: 5000 }])
    expect(r.skipped).toEqual([
      { line: 1, reason: "Đơn giá không phải số" },
      { line: 3, reason: "Trùng tên với dòng phía trên" },
      { line: 4, reason: "Thiếu tên nguyên liệu" },
    ])
  })
})
