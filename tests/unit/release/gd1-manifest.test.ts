import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"
import * as XLSX from "xlsx"

import manifest from "@/lib/delivery/gd1.manifest.json"

/**
 * Danh sách giai đoạn 1 (`docs/plan/BANGIAO_GD1_123_CHUC_NANG.md`, mục 1.2) là đầu vào của chế độ
 * chỉ bật 123 chức năng và của công cụ cắt repo. Test này giữ nó khớp với checklist nghiệm thu và với
 * trang, API có thật; trang mới phải được xếp loại thì mới qua.
 */
const APP_DIR = path.join(process.cwd(), "src/app")

function walk(dir: string, name: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full, name)
    return entry === name ? [full] : []
  })
}

function toUrl(file: string): string {
  const segments = path
    .relative(APP_DIR, path.dirname(file))
    .split(path.sep)
    .filter((segment) => segment && !/^\(.*\)$/.test(segment))
  return `/${segments.join("/")}`
}

const realPages = new Set(walk(APP_DIR, "page.tsx").map(toUrl))
const realApis = new Set(walk(APP_DIR, "route.ts").map(toUrl))

const workbook = XLSX.read(readFileSync(path.join(process.cwd(), manifest.checklist)))
type Row = Record<string, string | number | undefined>
const coverage = XLSX.utils.sheet_to_json<Row>(workbook.Sheets["Phủ 123 chức năng"]!)
const steps = ["Kịch bản", "Quyền & bảo mật"]
  .flatMap((sheet) => XLSX.utils.sheet_to_json<Row>(workbook.Sheets[sheet]!))
  .filter((row) => /^[A-Z]-\d+/.test(String(row["Mã bước"] ?? "")))
const stepCodes = new Map(
  steps.map((row) => [
    String(row["Mã bước"]),
    String(row["Mã chức năng"] ?? "").split(/[,;]/).map((code) => code.trim()),
  ]),
)

const featurePages = manifest.features.flatMap((feature) => feature.pages)
const pagesOf = (groups: { pages: string[] }[]) => groups.flatMap((group) => group.pages)
const delivered = new Set([...featurePages, ...pagesOf(manifest.framework)])
const undecided = new Set(pagesOf(manifest.undecided))
const excluded = new Set(pagesOf(manifest.excluded))

describe("danh sách giai đoạn 1", () => {
  it("đúng 123 mã của checklist nghiệm thu, không thừa không thiếu", () => {
    const expected = coverage.map((row) => String(row["Mã"])).filter((id) => /^\d+\.\d+$/.test(id))
    expect(expected).toHaveLength(123)
    expect(manifest.features.map((feature) => feature.id).sort()).toEqual([...expected].sort())
  })

  it("mọi trang và API được khai đều có thật", () => {
    const missingPages = [...delivered, ...undecided, ...excluded].filter((page) => !realPages.has(page))
    const missingApis = manifest.features.flatMap((feature) => feature.apis).filter((api) => !realApis.has(api))
    expect(missingPages).toEqual([])
    expect(missingApis).toEqual([])
  })

  it("mọi chức năng có màn hình hoặc API, hoặc ghi rõ chỉ chạy phía sau", () => {
    const empty = manifest.features.filter(
      (feature) => feature.pages.length === 0 && feature.apis.length === 0 && !("backendOnly" in feature),
    )
    expect(empty.map((feature) => feature.id)).toEqual([])
  })

  it("mọi chức năng gắn với bước nghiệm thu thật có nêu đúng mã đó", () => {
    const wrong = manifest.features.flatMap((feature) =>
      feature.scenarios.filter((step) => !stepCodes.get(step)?.includes(feature.id)).map((step) => `${feature.id}:${step}`),
    )
    expect(manifest.features.filter((feature) => feature.scenarios.length === 0)).toEqual([])
    expect(wrong).toEqual([])
  })

  it("mọi trang trong ứng dụng được xếp đúng một loại", () => {
    const unclassified = [...realPages].filter((page) => !delivered.has(page) && !undecided.has(page) && !excluded.has(page))
    const conflict = [...delivered].filter((page) => undecided.has(page) || excluded.has(page))
    const undecidedAndExcluded = [...undecided].filter((page) => excluded.has(page))
    expect(unclassified).toEqual([])
    expect(conflict).toEqual([])
    expect(undecidedAndExcluded).toEqual([])
  })

  it("không còn trang chờ quyết sau điểm duyệt Bước 1", () => {
    expect([...undecided]).toEqual([])
  })

  it("tầng SaaS Ngành không nằm trong bản giao", () => {
    expect(excluded.has("/van-hanh/nganh")).toBe(true)
    expect(delivered.has("/van-hanh/nganh")).toBe(false)
  })
})
