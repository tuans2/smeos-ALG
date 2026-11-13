import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Màn cài đặt/báo cáo của checklist bàn giao phải mở được từ một trang thật. Soát 06/11/2026 thấy phần cài đặt Thẻ Chào
 * (ngày lễ, phí giao, phí chế tác…), phễu chuyển đổi và đường vào màn Thành viên có mã nhưng không trang nào import tới.
 * Test đi đồ thị import từ mọi `page`/`layout`/`route` trong `src/app`; component dưới đây phải với tới được.
 */
const ROOT = path.resolve(__dirname, "../../..")
const SRC = path.join(ROOT, "src")

const MUST_BE_MOUNTED = [
  "src/components/greeting-card/admin/brochure-visibility-settings.tsx",
  "src/components/greeting-card/admin/brochure-discount-settings.tsx",
  "src/components/greeting-card/admin/brochure-default-owner-settings.tsx",
  "src/components/greeting-card/admin/brochure-shipping-settings.tsx",
  "src/components/greeting-card/admin/brochure-holiday-settings.tsx",
  "src/components/greeting-card/admin/craft-style-fee-settings.tsx",
  "src/components/greeting-card/admin/craft-fee-settings.tsx",
  "src/components/greeting-card/admin/chain-dispatch-settings.tsx",
  "src/components/greeting-card/admin/brochure-bank-sync-settings.tsx",
  "src/components/greeting-card/admin/brochure-notify-settings.tsx",
  "src/components/greeting-card/sales/sales-funnel-stats.tsx",
  "src/components/greeting-card/sales/channel-funnel-stats.tsx",
  "src/components/organization/custom-roles-manager.tsx",
  "src/components/organization/custom-domain-settings-tab.tsx",
  "src/components/organization/shop-fields-settings-tab.tsx",
]

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name !== "__tests__" && name !== "generated") walk(full, out)
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(full)
  }
  return out
}

function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? path.join(SRC, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null
  if (!base) return null
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) if (existsSync(base + ext) && statSync(base + ext).isFile()) return base + ext
  return null
}

const ENTRY = /^(page|layout|route|template|opengraph-image|error|not-found|loading|default)\.(ts|tsx)$/

function reachable(): Set<string> {
  const files = walk(SRC)
  const imports = new Map<string, string[]>()
  for (const f of files) {
    const text = readFileSync(f, "utf8")
    const specs = [...text.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]!)
    imports.set(f, specs.map((s) => resolveImport(f, s)).filter((x): x is string => x !== null))
  }
  const seen = new Set<string>()
  const stack = files.filter((f) => (f.includes(`${path.sep}app${path.sep}`) && ENTRY.test(path.basename(f))) || f.endsWith(`${path.sep}proxy.ts`))
  while (stack.length > 0) {
    const f = stack.pop()!
    if (seen.has(f)) continue
    seen.add(f)
    stack.push(...(imports.get(f) ?? []))
  }
  return seen
}

describe("giao diện của chức năng bàn giao được gắn vào trang", () => {
  it("mọi component trong danh sách với tới được từ một trang", () => {
    const seen = reachable()
    const orphans = MUST_BE_MOUNTED.filter((rel) => !seen.has(path.join(ROOT, rel)))
    expect(orphans, "Gắn component vào màn tương ứng (Cài đặt tiệm, Thẻ Chào…)").toEqual([])
  })
})
