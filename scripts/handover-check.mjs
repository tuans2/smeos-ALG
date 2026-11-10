// Kiểm bản giao khách: không có cấu hình/tài liệu agent nội bộ, tệp của khách hàng khác hay đường dẫn máy
// cá nhân. Luật: scripts/handover-rules.mjs. Loại tệp khỏi bản giao bằng `export-ignore` trong .gitattributes.
//
//   node scripts/handover-check.mjs [ref]                       # kiểm `git archive <ref>` (mặc định HEAD)
//   node scripts/handover-check.mjs --dir <bản cắt> --recipient ALG [--baseline <json>] [--write-baseline]
//
// `--dir` (kế hoạch GD1, Bước 2.4) kiểm một thư mục bản cắt và quét thêm NỘI DUNG (scripts/handover-content-rules.mjs):
// tên bên khác, số điện thoại, email, mật khẩu viết cứng, đường dẫn máy cá nhân. Phát hiện có sẵn trong baseline
// được cho qua (chỉ được giảm); phát hiện mới làm lệnh đỏ.
import { execFileSync } from "node:child_process"
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"

import { compareWithBaseline, isScannable, scanContent } from "./handover-content-rules.mjs"
import { LOCAL_PATH, findHandoverViolations } from "./handover-rules.mjs"

const args = process.argv.slice(2)
const flag = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const dir = flag("--dir")
const recipient = flag("--recipient")

function walk(root, rel = "") {
  return readdirSync(path.join(root, rel)).flatMap((entry) => {
    const next = rel ? `${rel}/${entry}` : entry
    if ([".git", "node_modules", ".next", "src/generated"].includes(next)) return []
    return statSync(path.join(root, next)).isDirectory() ? walk(root, next) : [next]
  })
}

function fail(title, items) {
  console.error(title)
  for (const item of items) console.error(`  - ${item}`)
  process.exit(1)
}

if (!dir) {
  const ref = args.find((arg) => !arg.startsWith("--")) ?? "HEAD"
  const tar = execFileSync("git", ["archive", "--format=tar", ref], { maxBuffer: 1 << 30 })
  const entries = execFileSync("tar", ["-t"], { input: tar, maxBuffer: 1 << 30 }).toString().split("\n").filter(Boolean)
  let withLocalPath = []
  try {
    withLocalPath = execFileSync("git", ["-c", "core.quotePath=false", "grep", "-lF", LOCAL_PATH, ref, "--"], { maxBuffer: 1 << 26 })
      .toString()
      .split("\n")
      .filter(Boolean)
      .map((line) => line.slice(ref.length + 1))
  } catch (err) {
    if (err.status !== 1) throw err // 1 = không có kết quả
  }
  const violations = findHandoverViolations(entries, withLocalPath.map((p) => p.normalize("NFC")).concat(withLocalPath), { recipient })
  if (violations.length) {
    fail(
      `✗ Bản giao (${ref}) có ${violations.length} mục không được bàn giao — thêm export-ignore vào .gitattributes hoặc sửa nội dung:`,
      violations.map((v) => `[${v.rule}] ${v.path}`),
    )
  }
  console.log(`✓ Bản giao (${ref}) sạch: ${entries.length} mục.`)
  process.exit(0)
}

const root = path.resolve(dir)
const entries = walk(root)
const texts = entries.filter(isScannable).map((file) => [file, readFileSync(path.join(root, file), "utf8")])
const withLocalPath = texts.filter(([, text]) => text.includes(LOCAL_PATH)).map(([file]) => file)
const violations = findHandoverViolations(entries, withLocalPath, { recipient })
if (violations.length) fail(`✗ Bản cắt có ${violations.length} mục không được bàn giao:`, violations.map((v) => `[${v.rule}] ${v.path}`))

const findings = texts.flatMap(([file, text]) => scanContent(file, text))
const baselinePath = flag("--baseline")
if (args.includes("--write-baseline")) {
  if (!baselinePath) fail("✗ --write-baseline cần --baseline <tệp>", [])
  const data = Object.fromEntries(findings.map((f) => [`${f.rule}|${f.path}`, f.count]).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(baselinePath, `${JSON.stringify(data, null, 2)}\n`)
  console.log(`Ghi baseline ${findings.length} mục vào ${baselinePath}`)
  process.exit(0)
}
const baseline = baselinePath ? JSON.parse(readFileSync(baselinePath, "utf8")) : {}
const { fresh, stale } = compareWithBaseline(findings, baseline)
for (const key of stale) console.warn(`  · baseline đã giảm, nên hạ mục: ${key}`)
if (fresh.length) fail(`✗ Nội dung bản cắt có ${fresh.length} phát hiện mới:`, fresh.map((f) => `[${f.rule}] ${f.path} (${f.count})`))
console.log(`✓ Bản cắt sạch: ${entries.length} tệp, ${findings.length} phát hiện cũ còn trong baseline.`)
