/**
 * Thử tải quy mô mục tiêu (ADR-015 D-O7, bước O-9) — phần tính toán thuần: phân vị thời gian và so với mục tiêu
 * (D-O1: p95 ≤ 200 ms cho request; báo cáo nặng ≤ 2 s, D-O6). Không import hạ tầng.
 */
export interface ScenarioResult {
  name: string
  samples: number
  errors: number
  p50: number
  p95: number
  p99: number
  max: number
  /** Mục tiêu p95 (ms) của kịch bản. */
  targetP95: number
  pass: boolean
}

/** Phân vị theo phương pháp "nearest rank" trên mảng đã sắp tăng dần. */
export function percentile(sortedMs: readonly number[], p: number): number {
  if (sortedMs.length === 0) return 0
  const rank = Math.ceil((p / 100) * sortedMs.length)
  return sortedMs[Math.min(sortedMs.length, Math.max(1, rank)) - 1] ?? 0
}

export function summarize(name: string, durationsMs: readonly number[], errors: number, targetP95: number): ScenarioResult {
  const sorted = [...durationsMs].sort((a, b) => a - b)
  const p95 = percentile(sorted, 95)
  return {
    name, samples: sorted.length, errors,
    p50: percentile(sorted, 50), p95, p99: percentile(sorted, 99), max: sorted.at(-1) ?? 0,
    targetP95, pass: errors === 0 && sorted.length > 0 && p95 <= targetP95,
  }
}

/** Bảng Markdown để dán vào biên bản thử tải. */
export function resultTable(results: readonly ScenarioResult[]): string {
  const ms = (v: number) => `${Math.round(v)} ms`
  const rows = results.map((r) => `| ${r.name} | ${r.samples} | ${r.errors} | ${ms(r.p50)} | ${ms(r.p95)} | ${ms(r.p99)} | ${ms(r.max)} | ≤ ${ms(r.targetP95)} | ${r.pass ? "Đạt" : "**Không đạt**"} |`)
  return ["| Kịch bản | Mẫu | Lỗi | p50 | p95 | p99 | Lâu nhất | Mục tiêu p95 | Kết quả |", "|---|---|---|---|---|---|---|---|---|", ...rows].join("\n")
}

/**
 * Chốt chặn CSDL của công cụ thử tải: chỉ CSDL tạm — tên kết thúc `_test`, `_load`, `_restore` (CSDL khôi phục PITR đặt
 * theo quy ước này) hoặc đúng tên `override` (`LOAD_TEST_DATABASE`). Trả tên CSDL, hoặc ném lỗi từ chối.
 */
export function assertLoadTestDatabaseName(url: string, override = ""): string {
  let name = ""
  try {
    name = new URL(url).pathname.replace(/^\//, "")
  } catch {
    throw new Error("DATABASE_URL không đọc được")
  }
  if (name === "" || !(/_(test|load|restore)$/.test(name) || override === name)) {
    throw new Error(`TỪ CHỐI: CSDL "${name}" không phải CSDL tạm. Đặt tên *_load / *_restore / *_test, hoặc LOAD_TEST_DATABASE=${name || "<tên>"} nếu chắc chắn.`)
  }
  return name
}
