import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it, expect } from "vitest"
import { modelDescription } from "@/app/(app)/cai-dat-ai/model-label"

// T3-6 (phương án A): màn Chính sách AI hiện mô tả tiếng Việt, tên model chỉ trong InfoTip.
describe("modelDescription", () => {
  it("trả mô tả tiếng Việt cho mô hình có trong danh mục", () => {
    expect(modelDescription("claude_opus", "Claude Opus 5")).toBe("Văn phong tự nhiên nhất")
    expect(modelDescription("gemini_flash", "Gemini 2.5 Flash")).toBe("Nhanh, tiết kiệm")
  })

  it("không có trong danh mục thì dùng tên trong sổ", () => {
    expect(modelDescription("local_cv", "Cục bộ")).toBe("Cục bộ")
  })

  it("trang không in thẳng display_name ra dòng Mô hình", () => {
    const src = readFileSync(join(process.cwd(), "src/app/(app)/cai-dat-ai/page.tsx"), "utf8")
    expect(src).toContain("modelDescription(m.key, m.display_name)")
    expect(src).toContain("<InfoTip")
  })
})
