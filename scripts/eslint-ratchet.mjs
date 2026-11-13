#!/usr/bin/env node
/**
 * Ratchet ESLint — chặn lỗi MỚI, không đòi dọn hết lỗi cũ trong một lần.
 *
 * Vì sao có (nợ #172, 05/10/2026): `main` mang 78 lỗi ESLint (chủ yếu
 * `no-explicit-any`). Bước `npm run lint` của CI đỏ trước tiên nên CI bỏ qua
 * luôn `npm test`, `test:tenant`, `test:platform`, `build` — cổng bắt buộc
 * cách ly tenant không chạy. Ratchet này thay bước đó trong CI: đỏ khi bất kỳ
 * (tệp, luật) nào có NHIỀU lỗi hơn baseline; lỗi cũ được dọn dần.
 *
 *   node scripts/eslint-ratchet.mjs                    # kiểm (dùng trong CI)
 *   node scripts/eslint-ratchet.mjs --update-baseline  # sau khi đã giảm lỗi
 *
 * Đếm theo (tệp, luật) chứ không theo dòng: số dòng xê dịch khi sửa tệp,
 * còn số lỗi thì không. Chỉ tính `error` — cảnh báo không làm `npm run lint` đỏ.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import path from "node:path"
import { ESLint } from "eslint"

const ROOT = path.resolve(import.meta.dirname, "..")
const BASELINE = path.join(ROOT, "scripts/eslint-baseline.json")

const results = await new ESLint({ cwd: ROOT }).lintFiles(["."])
/** @type {Record<string, Record<string, number>>} */
const current = {}
for (const r of results) {
  for (const m of r.messages) {
    if (m.severity !== 2) continue
    const file = path.relative(ROOT, r.filePath).split(path.sep).join("/")
    const rule = m.ruleId ?? "(parse)"
    current[file] ??= {}
    current[file][rule] = (current[file][rule] ?? 0) + 1
  }
}
const total = (o) => Object.values(o).reduce((s, rules) => s + Object.values(rules).reduce((a, b) => a + b, 0), 0)

if (process.argv.includes("--update-baseline")) {
  const sorted = Object.fromEntries(Object.keys(current).sort().map((f) => [f, current[f]]))
  writeFileSync(BASELINE, JSON.stringify({ total: total(current), files: sorted }, null, 2) + "\n")
  console.log(`✓ Đã ghi baseline: ${total(current)} lỗi ESLint → scripts/eslint-baseline.json`)
  process.exit(0)
}

if (!existsSync(BASELINE)) {
  console.error("✗ Chưa có scripts/eslint-baseline.json — chạy `npm run lint:ratchet -- --update-baseline`.")
  process.exit(1)
}
const baseline = JSON.parse(readFileSync(BASELINE, "utf8")).files

const regressions = []
for (const [file, rules] of Object.entries(current)) {
  for (const [rule, n] of Object.entries(rules)) {
    const allowed = baseline[file]?.[rule] ?? 0
    if (n > allowed) regressions.push(`  ✗ ${file}: ${rule} ${allowed} → ${n}`)
  }
}

if (regressions.length > 0) {
  console.error(`✗ ESLint ratchet: ${regressions.length} chỗ tăng lỗi so với baseline\n${regressions.join("\n")}`)
  console.error("\nSửa lỗi mới (chạy `npx eslint <tệp>` để xem chi tiết). Không cập nhật baseline để che lỗi mới.")
  process.exit(1)
}
const before = total(baseline)
const now = total(current)
console.log(
  now < before
    ? `✓ ESLint ratchet ĐẠT: lỗi giảm ${before} → ${now}. Chạy \`npm run lint:ratchet -- --update-baseline\` để khoá mức mới.`
    : `✓ ESLint ratchet ĐẠT: không có lỗi mới (${now} lỗi cũ, nợ #172).`
)
