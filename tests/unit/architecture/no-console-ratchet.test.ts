/**
 * Ratchet: log trong mã sản phẩm đi qua `src/core/observability/log.ts` (chuẩn 09,
 * ROADMAP E1.2) — dòng JSON có `requestId`, che khoá nhạy cảm. Số file còn gọi
 * `console.*` chỉ được GIẢM. Khi giảm, hạ BASELINE xuống đúng số mới.
 */
import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const ROOT = join(process.cwd(), "src")
const BASELINE = 29
const PATTERN = /\bconsole\.(log|info|warn|error|debug)\(/
const EXCLUDED = [/^core\/observability\/log\.ts$/, /^generated\//, /\.test\.tsx?$/, /__tests__\//]

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return walk(p)
    return /\.tsx?$/.test(name) ? [p] : []
  })
}

describe("giám sát — ratchet console.* ngoài log.ts", () => {
  it(`không vượt baseline ${BASELINE} file`, () => {
    const offenders = walk(ROOT)
      .map((p) => relative(ROOT, p).split("\\").join("/"))
      .filter((rel) => !EXCLUDED.some((re) => re.test(rel)))
      .filter((rel) => PATTERN.test(readFileSync(join(ROOT, rel), "utf8")))
    expect(offenders.length, `File mới gọi console.* — dùng log từ core/observability/log.ts:\n${offenders.join("\n")}`)
      .toBeLessThanOrEqual(BASELINE)
  })
})
