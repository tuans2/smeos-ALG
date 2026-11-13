import { describe, it, expect } from "vitest"
import { buildDiffRows } from "./diff-confirm"

// Console "Trường dữ liệu" (ĐP-3 3.15) — mọi thao tác ghi phải qua bảng
// khác biệt trước khi gọi API. `buildDiffRows` là hàm thuần quyết định
// dòng nào hiện trong bảng đó; khoá lại hành vi cốt lõi: chỉ hiện dòng
// THẬT SỰ đổi, và định dạng giá trị rỗng thành "—".
describe("buildDiffRows", () => {
  it("chỉ trả về các trường thật sự thay đổi", () => {
    const before = { label: "Cũ", requirement: "OPTIONAL", description: "" }
    const after = { label: "Mới", requirement: "OPTIONAL" }
    const rows = buildDiffRows(before, after, { label: "Nhãn", requirement: "Mức yêu cầu" })
    expect(rows).toEqual([{ label: "Nhãn", from: "Cũ", to: "Mới" }])
  })

  it("không thay đổi gì thì trả mảng rỗng", () => {
    const before = { label: "A" }
    const after = { label: "A" }
    const rows = buildDiffRows(before, after, { label: "Nhãn" })
    expect(rows).toEqual([])
  })

  it("giá trị rỗng/null/undefined hiện thành —", () => {
    const before: { description: string | null } = { description: "Có mô tả" }
    const after: { description: string | null } = { description: null }
    const rows = buildDiffRows(before, after, { description: "Mô tả" })
    expect(rows).toEqual([{ label: "Mô tả", from: "Có mô tả", to: "—" }])
  })

  it("dùng khoá làm nhãn khi không khai trong bảng nhãn", () => {
    const before = { catalogKey: "old" }
    const after = { catalogKey: "new" }
    const rows = buildDiffRows(before, after, {})
    expect(rows).toEqual([{ label: "catalogKey", from: "old", to: "new" }])
  })
})
