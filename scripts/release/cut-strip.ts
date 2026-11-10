import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

/**
 * Khối mã chỉ thuộc smeOS (dữ liệu mẫu của cửa hàng khác…) đánh dấu bằng hai dòng chú thích
 * `// @release-strip` … `// @release-strip-end`; bản cắt bỏ cả khối, kể cả hai dòng đánh dấu.
 */
const START = /^\s*(\/\/|#)\s*@release-strip(\s|$)(?!-end)/
const END = /^\s*(\/\/|#)\s*@release-strip-end\b/

export function stripBlocks(source: string): string {
  const out: string[] = []
  let depth = 0
  for (const line of source.split("\n")) {
    if (END.test(line)) {
      if (depth === 0) throw new Error("@release-strip-end không có @release-strip mở")
      depth -= 1
      continue
    }
    if (START.test(line)) {
      depth += 1
      continue
    }
    if (depth === 0) out.push(line)
  }
  if (depth !== 0) throw new Error("@release-strip chưa đóng")
  return out.join("\n")
}

/** Áp lên các tệp có đánh dấu; trả danh sách tệp đã sửa. */
export function stripFiles(root: string, files: readonly string[]): string[] {
  const changed: string[] = []
  for (const file of files) {
    if (!/\.(tsx?|mts|mjs|jsx?|py)$/.test(file)) continue
    const full = path.join(root, file)
    const source = readFileSync(full, "utf8")
    if (!source.includes("@release-strip")) continue
    const result = stripBlocks(source)
    if (result === source) continue
    writeFileSync(full, result)
    changed.push(file)
  }
  return changed
}
