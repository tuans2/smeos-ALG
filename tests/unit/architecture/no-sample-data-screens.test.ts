import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Audit BL-22, BL-23 (11/11/2026) — `AGENT_RULES.md` §14 #24: màn thật không được gắn thành phần chạy bằng dữ liệu mẫu
 * cứng. "Sổ đối soát" đối tác hiện 3 dòng mẫu và nút "Đã thanh toán" chỉ đổi state trình duyệt; "Hiệu quả quảng cáo"
 * trên `/so-lieu` tính ROAS từ chiến dịch mẫu. Cả hai đã xoá (12/11/2026: sổ đối soát thay bằng bảng kê thật, báo cáo quảng
 * cáo chờ nguồn dữ liệu thật); guard giữ lại để không ai dựng lại chúng trên dữ liệu mẫu.
 */
const ROOT = process.cwd()
const SCAN = ["src/app", "src/components"]
/** Thành phần chỉ có dữ liệu mẫu — không màn nào được import. */
const SAMPLE_ONLY_COMPONENTS = ["coordinator/partner-settlement-modal", "marketing/ad-performance-modal"]
/** Hằng dữ liệu mẫu — chỉ tệp khai báo được nhắc tới. */
const SAMPLE_CONSTANTS = ["SAMPLE_SETTLEMENT_ITEMS", "SAMPLE_FLOWER_AD_CAMPAIGNS"]

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

const sources = SCAN.flatMap((d) => files(join(ROOT, d))).map((path) => ({ path: relative(ROOT, path), text: readFileSync(path, "utf-8") }))

describe("màn thật không dùng dữ liệu mẫu", () => {
  it("không màn nào import thành phần chỉ có dữ liệu mẫu", () => {
    const hits = sources
      .filter((s) => SAMPLE_ONLY_COMPONENTS.some((c) => s.text.includes(`/${c}"`) || s.text.includes(`./${c.split("/")[1]}"`)))
      .map((s) => s.path)
    expect(hits).toEqual([])
  })

  it("hằng dữ liệu mẫu chỉ nằm ở tệp khai báo của nó", () => {
    const hits = sources
      .filter((s) => !SAMPLE_ONLY_COMPONENTS.some((c) => s.path.endsWith(`${c}.tsx`)))
      .filter((s) => SAMPLE_CONSTANTS.some((c) => s.text.includes(c)))
      .map((s) => s.path)
    expect(hits).toEqual([])
  })
})
