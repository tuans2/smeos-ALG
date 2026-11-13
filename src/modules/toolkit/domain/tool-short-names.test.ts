import { describe, expect, it } from "vitest"
import { getAllTools } from "./toolkit-catalog"
import { TOOL_SHORT_NAMES, toolShortName } from "./tool-short-names"

describe("tên ngắn công cụ", () => {
  it("mọi công cụ trong danh mục có tên ngắn ≤ 5 từ", () => {
    for (const tool of getAllTools()) {
      const short = TOOL_SHORT_NAMES[tool.id]
      expect(short, `thiếu tên ngắn cho công cụ ${tool.id}`).toBeTruthy()
      expect((short ?? "").split(/\s+/).length).toBeLessThanOrEqual(5)
    }
  })

  it("không có tên ngắn thì dùng tên đầy đủ", () => {
    expect(toolShortName({ id: -1, name: "Công cụ lộ trình" })).toBe("Công cụ lộ trình")
  })
})
