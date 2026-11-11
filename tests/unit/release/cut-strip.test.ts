import { describe, expect, it } from "vitest"

import { stripBlocks } from "../../../scripts/release/cut-strip"

/** Kế hoạch bàn giao GD1, Bước 2.3: khối chỉ thuộc smeOS bị bỏ khỏi bản cắt. */
describe("bỏ khối @release-strip", () => {
  it("bỏ cả khối lẫn hai dòng đánh dấu, giữ phần còn lại", () => {
    const source = ["a", "  // @release-strip — lý do", "  b", "  // @release-strip-end", "c", "# @release-strip", "d", "# @release-strip-end"].join("\n")
    expect(stripBlocks(source)).toBe("a\nc")
  })

  it("không có đánh dấu thì giữ nguyên", () => {
    expect(stripBlocks("x\ny\n")).toBe("x\ny\n")
  })

  it("đánh dấu lệch thì báo lỗi thay vì cắt sai", () => {
    expect(() => stripBlocks("// @release-strip\nx")).toThrow()
    expect(() => stripBlocks("x\n// @release-strip-end")).toThrow()
  })
})
