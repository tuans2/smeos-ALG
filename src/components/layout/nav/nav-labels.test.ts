import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// Nhãn mục sidebar ≤ 5 từ (OPERATING_PRINCIPLES §6). Tiêu đề nhóm "01 · …" được loại trừ.
describe("nhãn sidebar ngắn gọn", () => {
  it("mọi nhãn mục (không phải tiêu đề nhóm) có tối đa 5 từ", () => {
    const dir = join(process.cwd(), "src/components/layout/nav")
    const long: string[] = []
    for (const f of readdirSync(dir).filter((x) => /^nav-.*\.ts$/.test(x) && !x.includes("types"))) {
      for (const m of readFileSync(join(dir, f), "utf8").matchAll(/label: "([^"]+)"/g)) {
        const label = m[1] ?? ""
        if (label.includes("·")) continue
        if (label.split(/\s+/).length > 5) long.push(`${f}: ${label}`)
      }
    }
    expect(long).toEqual([])
  })
})
