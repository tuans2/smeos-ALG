import { describe, expect, it } from "vitest"
import { mergeCustomFields } from "./apply-custom-fields"

describe("mergeCustomFields — giữ giá trị cũ của trường đã bị tắt (§16.3)", () => {
  it("trộn giá trị mới vào, không xoá khoá cũ không nằm trong bản mới", () => {
    const existing = { cf_ghi_chu_cu: "giá trị cũ", cf_ma_po: "PO-1" }
    const result = mergeCustomFields(existing, { cf_ma_po: "PO-2" })
    expect(result).toEqual({ cf_ghi_chu_cu: "giá trị cũ", cf_ma_po: "PO-2" })
  })

  it("existing rỗng vẫn hoạt động", () => {
    expect(mergeCustomFields(null, { cf_a: 1 })).toEqual({ cf_a: 1 })
    expect(mergeCustomFields(undefined, {})).toEqual({})
  })
})
