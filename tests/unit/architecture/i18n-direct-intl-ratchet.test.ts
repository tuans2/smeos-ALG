/**
 * Ratchet: định dạng số/tiền/ngày phải đi qua `src/lib/i18n/formatters.ts`
 * (DOC-ARCH-I18N-001 §5). Số file còn gọi `Intl.*Format` / `toLocale*String`
 * trực tiếp chỉ được GIẢM. Khi giảm, hạ BASELINE xuống đúng số mới.
 */
import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const ROOT = join(process.cwd(), "src")
const BASELINE = 172
const PATTERN = /new Intl\.(Number|DateTime)Format|\.toLocale(Date|Time)?String\(/
const EXCLUDED = [/^lib\/i18n\//, /^generated\//, /\.test\.tsx?$/, /__tests__\//]

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return walk(p)
    return /\.tsx?$/.test(name) ? [p] : []
  })
}

describe("i18n — ratchet gọi Intl trực tiếp ngoài formatters", () => {
  it(`không vượt baseline ${BASELINE} file`, () => {
    const offenders = walk(ROOT)
      .map((p) => relative(ROOT, p).split("\\").join("/"))
      .filter((rel) => !EXCLUDED.some((re) => re.test(rel)))
      .filter((rel) => PATTERN.test(readFileSync(join(ROOT, rel), "utf8")))
    expect(offenders.length, `File mới gọi Intl trực tiếp — dùng formatters.ts:\n${offenders.join("\n")}`)
      .toBeLessThanOrEqual(BASELINE)
  })
})
