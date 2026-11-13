import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * K11 (PO 05/11/2026, `docs/plan/k11-file-size-policy.md`): tệp nguồn tối đa 350 dòng.
 * Tệp đang vượt (baseline) không được dài thêm; tệp mới vượt ngưỡng phải nằm trong `exemptions`
 * (chỉ tệp dữ liệu/danh mục thuần, có lý do). Tách tệp xong thì hạ hoặc xoá dòng baseline.
 */
const CONFIG = JSON.parse(readFileSync(join(process.cwd(), "scripts/file-size-baseline.json"), "utf8")) as {
  limit: number
  exemptions: Record<string, string>
  baseline: Record<string, number>
}

function sourceFiles(): string[] {
  return execFileSync("git", ["ls-files", "src/**/*.ts", "src/**/*.tsx"], { cwd: process.cwd() })
    .toString()
    .split("\n")
    .filter((p) => p && !/\.test\.|__tests__|\/generated\//.test(p))
}

function lineCount(path: string): number {
  const text = readFileSync(join(process.cwd(), path), "utf8")
  return text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length
}

describe("K11 — giới hạn 350 dòng mỗi tệp nguồn", () => {
  it("tệp vượt ngưỡng phải có trong baseline và không dài hơn baseline", () => {
    const problems: string[] = []
    for (const path of sourceFiles()) {
      const n = lineCount(path)
      if (n <= CONFIG.limit || CONFIG.exemptions[path]) continue
      const allowed = CONFIG.baseline[path]
      if (allowed === undefined) problems.push(`${path}: ${n} dòng (tệp mới vượt ${CONFIG.limit})`)
      else if (n > allowed) problems.push(`${path}: ${allowed} → ${n} dòng (dài thêm)`)
    }
    expect(problems, "Tách tệp hoặc giữ không dài thêm — docs/plan/k11-file-size-policy.md").toEqual([])
  })

  it("miễn trừ chỉ dành cho tệp .ts dữ liệu/danh mục và có lý do", () => {
    for (const [path, reason] of Object.entries(CONFIG.exemptions)) {
      expect(path.endsWith(".ts"), path).toBe(true)
      expect(reason.trim().length, path).toBeGreaterThan(0)
    }
  })
})
