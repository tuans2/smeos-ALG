import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Quản trị SSOT Design System (ADR-011 D-UI-04, D-UI-07, D-UI-12):
 * - tài liệu `docs/design-system/` không được trỏ tới tệp không tồn tại
 *   (rà soát 07/11/2026: README trỏ `layouts.md`, `responsive.md`, `accessibility.md` khi chưa có);
 * - CODEOWNERS phải gán các vùng Design System cho một tài khoản GitHub thật
 *   (trước đây là `@po` — không phân giải được nên yêu cầu PO duyệt không có hiệu lực).
 */
const REPO = path.resolve(__dirname, "../../..")
const DS_DIR = path.join(REPO, "docs/design-system")

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return markdownFiles(full)
    return name.endsWith(".md") ? [full] : []
  })
}

function relativeLinks(markdown: string): string[] {
  const out: string[] = []
  for (const m of markdown.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1]!.split("#")[0]!
    if (!target || /^[a-z]+:/i.test(target)) continue
    out.push(decodeURIComponent(target))
  }
  return out
}

describe("Design System SSOT — liên kết tài liệu", () => {
  it("mọi liên kết tương đối trong docs/design-system/**/*.md trỏ tới tệp có thật", () => {
    const broken: string[] = []
    for (const file of markdownFiles(DS_DIR)) {
      for (const link of relativeLinks(readFileSync(file, "utf8"))) {
        if (!existsSync(path.resolve(path.dirname(file), link))) {
          broken.push(`${path.relative(REPO, file)} → ${link}`)
        }
      }
    }
    expect(broken).toEqual([])
  })

  it("README liệt kê đủ tài liệu chuẩn ADR-011 D-UI-04", () => {
    const readme = readFileSync(path.join(DS_DIR, "README.md"), "utf8")
    const linked = new Set(relativeLinks(readme))
    for (const doc of ["tokens.md", "components/", "layouts.md", "responsive.md", "accessibility.md", "CHANGELOG.md"]) {
      expect(linked.has(doc), `README thiếu liên kết tới ${doc}`).toBe(true)
    }
  })
})

describe("Design System SSOT — CODEOWNERS", () => {
  const rules = readFileSync(path.join(REPO, ".github/CODEOWNERS"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const [pattern, ...owners] = l.split(/\s+/)
      return { pattern: pattern!, owners }
    })

  it("các vùng ADR-011 D-UI-07 đều có chủ sở hữu", () => {
    for (const p of ["/src/styles/tokens/", "/src/components/ui/", "/src/components/layout/", "/docs/design-system/"]) {
      const rule = rules.find((r) => r.pattern === p)
      expect(rule?.owners.length ?? 0, `CODEOWNERS thiếu ${p}`).toBeGreaterThan(0)
    }
  })

  it("chủ sở hữu là tên GitHub hợp lệ, không phải tên vai trò giữ chỗ", () => {
    const PLACEHOLDERS = new Set(["@po", "@owner", "@team", "@admin"])
    for (const { pattern, owners } of rules) {
      for (const o of owners) {
        expect(o, `${pattern}: ${o}`).toMatch(/^@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\/[A-Za-z0-9._-]+)?$/)
        expect(PLACEHOLDERS.has(o.toLowerCase()), `${pattern}: ${o} là tên giữ chỗ`).toBe(false)
      }
    }
  })
})
