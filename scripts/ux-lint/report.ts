import type { Violation } from "./rules"

export type { Violation }

export interface AllowlistEntry {
  rule: string
  path?: string
  pathGlob?: string
  match?: string
  reason: string
  until?: string
}

export interface AllowlistConfig {
  entries: AllowlistEntry[]
}

export interface BaselineData {
  summary: Record<string, Record<string, number>>
  total: number
  updatedAt: string
}

/** Get directory bucket (e.g. components/market-intelligence, app/(app), etc.) */
export function getDirectoryBucket(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/")
  const parts = normalized.split("/")

  if (parts.length >= 3 && parts[0] === "src") {
    return `${parts[1]}/${parts[2]}`
  }
  return parts.slice(0, 2).join("/")
}

/** Check if violation is allowlisted */
export function isAllowlisted(v: Violation, allowlist: AllowlistConfig): boolean {
  for (const entry of allowlist.entries) {
    if (entry.rule !== v.rule) continue

    if (entry.path && v.file === entry.path) {
      if (!entry.match) return true
      if (new RegExp(entry.match, "i").test(v.snippet)) return true
    }

    if (entry.pathGlob) {
      const globPrefix = entry.pathGlob.replace(/\/\*\*.*$/, "")
      if (v.file.startsWith(globPrefix)) {
        if (!entry.match) return true
        if (new RegExp(entry.match, "i").test(v.snippet)) return true
      }
    }
  }
  return false
}

/** Format table output */
export function printSummaryTable(violations: Violation[]) {
  const buckets = Array.from(new Set(violations.map((v) => getDirectoryBucket(v.file)))).sort()
  const rules = Array.from(new Set(violations.map((v) => v.rule))).sort()

  const matrix: Record<string, Record<string, number>> = {}
  for (const b of buckets) {
    matrix[b] = {}
    for (const r of rules) {
      matrix[b]![r] = 0
    }
  }

  for (const v of violations) {
    const b = getDirectoryBucket(v.file)
    const row = matrix[b] ?? (matrix[b] = {})
    row[v.rule] = (row[v.rule] || 0) + 1
  }

  console.log("\n======================== UX LINT SUMMARY ========================")
  console.log(`Tổng số vi phạm: ${violations.length}\n`)

  const header = ["Thư mục", ...rules, "Tổng"].map((s) => s.padEnd(16)).join(" | ")
  console.log(header)
  console.log("-".repeat(header.length))

  for (const b of buckets) {
    let rowTotal = 0
    const row = matrix[b] ?? {}
    const cols = rules.map((r) => {
      const count = row[r] || 0
      rowTotal += count
      return String(count || "-").padStart(6)
    })
    console.log([b.padEnd(28), ...cols.map((c) => c.padEnd(12)), String(rowTotal).padStart(6)].join(" | "))
  }

  console.log("-".repeat(header.length))
  const totals = rules.map((r) => {
    const sum = violations.filter((v) => v.rule === r).length
    return String(sum).padStart(6)
  })
  console.log(["TỔNG".padEnd(28), ...totals.map((t) => t.padEnd(12)), String(violations.length).padStart(6)].join(" | "))
  console.log("=================================================================\n")
}

export function buildMatrix(violations: Violation[]): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {}
  for (const v of violations) {
    const b = getDirectoryBucket(v.file)
    const row = matrix[b] ?? (matrix[b] = {})
    row[v.rule] = (row[v.rule] || 0) + 1
  }
  return matrix
}
