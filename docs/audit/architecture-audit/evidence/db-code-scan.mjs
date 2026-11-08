#!/usr/bin/env node
// Bằng chứng cho `20_DATABASE_ARCHITECTURE_AUDIT.md`: quét mã truy cập dữ liệu trong `src/` (heuristic, chỉ đọc).
//   node docs/audit/architecture-audit/evidence/db-code-scan.mjs [summary|findManyNoTake|loopQueries|rawUnsafe|multiWriteNoTx|containsInsensitive]
// Heuristic: tìm khối bằng cân ngoặc, không hiểu kiểu — mỗi dòng liệt kê là ỨNG VIÊN cần đọc tay, chưa phải lỗi.
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const mode = process.argv[2] ?? "summary"

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".") || e.name === "generated") continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name) && !p.includes("__tests__")) acc.push(p)
  }
  return acc
}

/** Đoạn văn bản từ ký tự mở ở vị trí `i` tới ký tự đóng cân bằng. */
function block(s, i, open = "(", close = ")") {
  let depth = 0
  for (let j = i; j < s.length; j++) {
    if (s[j] === open) depth++
    else if (s[j] === close && --depth === 0) return s.slice(i, j + 1)
  }
  return s.slice(i)
}

const R = {
  tx: 0, txInteractive: 0, isolation: 0, raw: 0, findMany: 0, deleteMany: 0,
  findManyNoTake: [], loopQueries: [], rawUnsafe: [], multiWriteNoTx: [], containsInsensitive: [],
}
const PRISMA_WRITE = /\bprisma\.(\w+)\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/g

for (const f of walk(path.join(ROOT, "src"))) {
  const s = fs.readFileSync(f, "utf8")
  const rel = path.relative(ROOT, f)
  for (const m of s.matchAll(/\$transaction\(/g)) {
    R.tx++
    const b = block(s, m.index + m[0].length - 1)
    if (/^\(\s*(async\b|\(?\s*\w*\s*\)?\s*=>)/.test(b)) R.txInteractive++
    if (/isolationLevel/.test(b)) R.isolation++
  }
  for (const m of s.matchAll(/\.(\w+)\.findMany\(/g)) {
    if (!/(prisma|tx|db|client)\s*$/.test(s.slice(Math.max(0, m.index - 12), m.index))) continue
    R.findMany++
    if (!/\btake\b/.test(block(s, m.index + m[0].length - 1))) R.findManyNoTake.push(`${rel} :: ${m[1]}`)
  }
  for (const m of s.matchAll(/\bfor\s*(await\s*)?\(/g)) {
    const headStart = m.index + m[0].length - 1
    const head = block(s, headStart)
    const k = s.indexOf("{", headStart + head.length)
    if (k < 0 || k - (headStart + head.length) > 5) continue
    const q = block(s, k, "{", "}").match(/await\s+(prisma|tx|db)\.(\w+)\.(find\w*|create|update|upsert|delete|count|aggregate)\w*\(/)
    if (q) R.loopQueries.push(`${rel} :: ${q[2]}.${q[3]}`)
  }
  if (/\$(queryRawUnsafe|executeRawUnsafe)\(/.test(s)) R.rawUnsafe.push(rel)
  R.raw += (s.match(/\$(queryRaw|executeRaw)`/g) ?? []).length
  R.deleteMany += (s.match(/\.deleteMany\(/g) ?? []).length
  const writes = [...s.matchAll(PRISMA_WRITE)].length
  if (writes >= 2 && !/\$transaction|runInTransaction/.test(s)) R.multiWriteNoTx.push(`${rel} (${writes})`)
  const ci = (s.match(/contains:[^}\n]*mode:\s*["']insensitive["']/g) ?? []).length
  if (ci > 0) R.containsInsensitive.push(`${rel} (${ci})`)
}

if (mode === "summary") {
  const { findManyNoTake, loopQueries, rawUnsafe, multiWriteNoTx, containsInsensitive, ...counts } = R
  console.log({
    ...counts,
    findManyNoTake: findManyNoTake.length, loopQueries: loopQueries.length, rawUnsafe: rawUnsafe.length,
    multiWriteNoTx: multiWriteNoTx.length, containsInsensitiveFiles: containsInsensitive.length,
  })
} else console.log((R[mode] ?? []).join("\n"))
