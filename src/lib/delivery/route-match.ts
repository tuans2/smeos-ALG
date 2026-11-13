/**
 * So khớp đường dẫn với mẫu route của App Router (`/san-pham/[id]`, `/api/v1/storage/[...key]`), theo thứ tự
 * ưu tiên của Next.js: đoạn tĩnh thắng đoạn động, đoạn động thắng đoạn bắt-tất-cả. Thuần, không đọc tệp —
 * dùng chung cho `proxy.ts` (chế độ giai đoạn) và công cụ cắt repo (`scripts/release/`).
 */

type Segment = { kind: "static"; value: string } | { kind: "dynamic" } | { kind: "catchAll"; optional: boolean }

function parse(pattern: string): Segment[] {
  return pattern
    .split("/")
    .filter(Boolean)
    .map((part): Segment => {
      if (/^\[\[\.\.\..+\]\]$/.test(part)) return { kind: "catchAll", optional: true }
      if (/^\[\.\.\..+\]$/.test(part)) return { kind: "catchAll", optional: false }
      if (/^\[.+\]$/.test(part)) return { kind: "dynamic" }
      return { kind: "static", value: part }
    })
}

/** Điểm khớp: mỗi đoạn tĩnh 3, động 2, bắt-tất-cả 1; `null` khi không khớp. */
export function matchScore(pattern: string, pathname: string): number[] | null {
  const segments = parse(pattern)
  const parts = pathname.split("/").filter(Boolean)
  const score: number[] = []
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!
    if (segment.kind === "catchAll") {
      if (index !== segments.length - 1) return null
      const rest = parts.length - index
      if (rest < (segment.optional ? 0 : 1)) return null
      score.push(1)
      return score
    }
    const part = parts[index]
    if (part === undefined) return null
    if (segment.kind === "static" && segment.value !== part) return null
    score.push(segment.kind === "static" ? 3 : 2)
  }
  return parts.length === segments.length ? score : null
}

function compare(a: number[], b: number[]): number {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/** Mẫu route mà Next.js sẽ chọn cho `pathname`, hoặc `null` khi không mẫu nào khớp. */
export function bestMatch(patterns: Iterable<string>, pathname: string): string | null {
  let best: { pattern: string; score: number[] } | null = null
  for (const pattern of patterns) {
    const score = matchScore(pattern, pathname)
    if (score && (!best || compare(score, best.score) > 0)) best = { pattern, score }
  }
  return best?.pattern ?? null
}

/** Đổi thư mục trong `src/app` thành mẫu URL: bỏ nhóm `(app)`, bỏ slot `@x`. */
export function dirToPattern(relativeDir: string): string {
  const segments = relativeDir
    .split(/[\\/]/)
    .filter((segment) => segment && !/^\(.*\)$/.test(segment) && !segment.startsWith("@"))
  return `/${segments.join("/")}`
}
