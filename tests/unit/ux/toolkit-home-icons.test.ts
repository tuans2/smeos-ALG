import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it, expect } from "vitest"

// T3-5(a): trang chủ công cụ dùng icon chuẩn thay emoji (OPERATING_PRINCIPLES §6.11).
const src = readFileSync(join(process.cwd(), "src/components/dashboard/toolkit-home.tsx"), "utf8")

describe("toolkit-home — icon thay emoji (T3-5a)", () => {
  it("không còn emoji trạng thái trong giao diện", () => {
    for (const emoji of ["✅", "🔨", "🏗️", "📋"]) expect(src).not.toContain(emoji)
  })

  it("mỗi trạng thái có icon từ bộ icon chuẩn", () => {
    expect(src).toMatch(/STATUS_ICON: Record<ToolStatus/)
    for (const icon of ["CheckCircle2", "Hammer", "Layers", "ClipboardList"]) {
      expect(src).toContain(`@/components/ui/icon-set/`)
      expect(src).toContain(icon)
    }
  })
})
