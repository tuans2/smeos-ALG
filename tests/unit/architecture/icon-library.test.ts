import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

// Bộ icon chuẩn là Phosphor qua `@/components/ui/icons` / `app-icon` (OPERATING_PRINCIPLES §6.11).
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

describe("bộ icon thống nhất", () => {
  it("không file nào trong src import trực tiếp lucide-react", () => {
    const offenders = walk("src").filter((f) => /from ["']lucide-react["']/.test(readFileSync(f, "utf8")))
    expect(offenders).toEqual([])
  })
})
