#!/usr/bin/env node
// Bằng chứng cho `19_SYSTEM_ARCHITECTURE_AUDIT.md`: dựng đồ thị import của `src/`
// (tự phân giải alias `@/`, không cần node_modules) rồi đo ranh giới tầng, vòng
// phụ thuộc và độ kết dính giữa module. Chỉ đọc, không ghi gì vào repo.
//
//   node docs/audit/architecture-audit/evidence/arch-graph.mjs [summary|cycles|modules|upward|writers|violations <key>]
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const SRC = path.join(ROOT, "src")
const [mode = "summary", arg] = process.argv.slice(2)

// ── 1. Đồ thị ────────────────────────────────────────────────────────────────
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(e.name) && !e.name.endsWith(".d.ts")) acc.push(p)
  }
  return acc
}
const files = walk(SRC)
const fileSet = new Set(files)
const EXT = [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js"]
function resolve(from, spec) {
  let base
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2))
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec)
  else return null
  for (const b of [base, base.replace(/\.js$/, "")]) {
    if (fileSet.has(b)) return path.relative(ROOT, b)
    for (const e of EXT) if (fileSet.has(b + e)) return path.relative(ROOT, b + e)
  }
  return null
}
const STATIC = /(^|\n)\s*(import|export)\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/g
const DYNAMIC = /(?:import|require)\(\s*["']([^"']+)["']\s*\)/g
// `{ type A, type B as C }` → chỉ import kiểu. Tách theo dấu phẩy rồi kiểm từng phần: một regex
// lặp lồng nhau trên cả khối dễ backtrack theo cấp số mũ (CodeQL js/redos).
function isTypeOnlyClause(clause) {
  const t = clause.trim()
  if (!t.startsWith("{") || !t.endsWith("}")) return false
  const parts = t.slice(1, -1).split(",").map((p) => p.trim()).filter(Boolean)
  return parts.length > 0 && parts.every((p) => /^type\s+[\w$]+(?:\s+as\s+\w+)?$/.test(p))
}
const g = {}
for (const f of files) {
  const raw = fs.readFileSync(f, "utf8")
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
  const deps = []
  for (const m of src.matchAll(STATIC)) {
    const typeOnly = !!m[3] || isTypeOnlyClause(m[4])
    deps.push({ spec: m[5], typeOnly, dynamic: false })
  }
  for (const m of src.matchAll(DYNAMIC)) deps.push({ spec: m[1], typeOnly: false, dynamic: true })
  const rel = path.relative(ROOT, f)
  g[rel] = {
    lines: raw.split("\n").length,
    test: /\.(test|spec)\.(ts|tsx)$/.test(f) || f.includes("/__tests__/"),
    client: /^\s*["']use client["']/m.test(raw.slice(0, 400)),
    deps: deps.map((d) => ({ ...d, to: resolve(f, d.spec) })),
  }
}
const prod = Object.entries(g).filter(([, n]) => !n.test)

// ── 2. Phân loại tầng ────────────────────────────────────────────────────────
function classify(f) {
  let m
  if ((m = /^src\/modules\/([^/]+)\/([^/]+)\//.exec(f))) return { area: "module", mod: m[1], layer: m[2] }
  if ((m = /^src\/modules\/([^/]+)\//.exec(f))) return { area: "module", mod: m[1], layer: "root" }
  if ((m = /^src\/core\/([^/]+)\//.exec(f))) return { area: "core", mod: "core/" + m[1], layer: f.split("/")[3] }
  if (f.startsWith("src/app/api/")) return { area: "api", mod: "app/api", layer: "route" }
  if (f.startsWith("src/app/")) return { area: "app", mod: "app", layer: "page" }
  if ((m = /^src\/components\/([^/]+)\//.exec(f))) return { area: "components", mod: "components/" + m[1], layer: "ui" }
  if (f.startsWith("src/lib/")) return { area: "lib", mod: "lib", layer: "lib" }
  if (f.startsWith("src/layers/")) return { area: "layers", mod: "layers", layer: "layers" }
  return { area: "root", mod: "root", layer: "root" }
}
const PRISMA = (s) => s === "@prisma/client" || s.startsWith("@/generated/prisma")
const DB_CLIENT = "src/core/tenancy/infra/prisma.ts"
const UI = new Set(["components", "app", "api"])

// ── 3. Luật ranh giới ────────────────────────────────────────────────────────
const V = {}
const add = (k, f, d) => (V[k] ??= []).push(`${f} -> ${d}`)
for (const [f, n] of prod) {
  const a = classify(f)
  for (const d of n.deps) {
    if (PRISMA(d.spec) && a.layer === "domain") add("domain->prisma", f, d.spec)
    if (PRISMA(d.spec) && !d.typeOnly && UI.has(a.area)) add(`${a.area}->prisma`, f, d.spec)
    if (/^(openai|@anthropic-ai\/|@google\/gen|replicate|@fal-ai|elevenlabs|ioredis|nodemailer|pg$)/.test(d.spec) && a.layer !== "adapters")
      add("sdk-outside-adapters", f, d.spec)
    if (/^(next|react)(\/|$|-dom)/.test(d.spec) && a.layer === "domain") add("domain->framework", f, d.spec)
    if (!d.to) continue
    const b = classify(d.to)
    if (d.to === DB_CLIENT && a.layer !== "infra") add(`db-client-from:${a.area}/${a.layer}`, f, d.to)
    if (a.layer === "domain" && b.area === "module" && ["infra", "adapters", "use-cases"].includes(b.layer)) add("domain->infra|adapters|use-cases", f, d.to)
    if (a.area === "module" && UI.has(b.area)) add(`module(${a.layer})->ui`, f, d.to)
    if (a.area === "core" && b.area === "module") add("core->modules", f, d.to)
    if (a.area === "lib" && b.area === "module") add("lib->modules", f, d.to)
    if (a.area === "lib" && UI.has(b.area)) add("lib->ui", f, d.to)
    if (a.area === "components" && b.area === "app") add("components->app", f, d.to)
    if (a.area === "components" && b.area === "module" && ["infra", "adapters", "use-cases"].includes(b.layer) && !d.typeOnly) add(`components->module/${b.layer}`, f, d.to)
    if ((a.area === "api" || a.area === "app") && b.area === "module" && ["infra", "adapters"].includes(b.layer) && !d.typeOnly) add(`${a.area}->module/${b.layer}`, f, d.to)
    if (a.area === "module" && b.area === "module" && a.mod === b.mod && ["infra", "adapters"].includes(a.layer) && b.layer === "use-cases") add("intra:infra|adapters->use-cases", f, d.to)
    if (a.area === "module" && b.area === "module" && a.mod !== b.mod && !d.typeOnly) {
      add(`cross-module->${["domain", "use-cases", "infra", "adapters", "contracts"].includes(b.layer) ? b.layer : "other"}`, f, d.to)
      if (["infra", "adapters"].includes(a.layer) && b.layer === "use-cases") add("cross:infra->use-cases", f, d.to)
    }
  }
}

// ── 4. Vòng phụ thuộc (Tarjan SCC) ───────────────────────────────────────────
function scc(edges) {
  let idx = 0
  const st = [], on = new Set(), I = {}, L = {}, out = []
  const visit = (v) => {
    I[v] = L[v] = idx++
    st.push(v); on.add(v)
    for (const w of edges[v] ?? []) {
      if (I[w] === undefined) { visit(w); L[v] = Math.min(L[v], L[w]) } else if (on.has(w)) L[v] = Math.min(L[v], I[w])
    }
    if (L[v] === I[v]) {
      const c = []
      let w
      do { w = st.pop(); on.delete(w); c.push(w) } while (w !== v)
      if (c.length > 1) out.push(c.sort())
    }
  }
  for (const v of Object.keys(edges)) if (I[v] === undefined) visit(v)
  return out.sort((x, y) => y.length - x.length)
}
function edgesBy(keyOf, { runtime = true, skip = () => false } = {}) {
  const e = {}
  for (const [f, n] of prod) {
    const a = keyOf(f)
    if (!a) continue
    e[a] ??= []
    for (const d of n.deps) {
      if (!d.to || g[d.to]?.test || (runtime && (d.typeOnly || d.dynamic))) continue
      const b = keyOf(d.to)
      if (b && b !== a && !skip(a, b) && !e[a].includes(b)) e[a].push(b)
    }
  }
  return e
}
const modOf = (f) => /^src\/modules\/([^/]+)\//.exec(f)?.[1] ?? null
const fileOf = (f) => f
// Nhân nền tảng — module mà nghiệp vụ dựa vào; nhân không được phụ thuộc ngược lên nghiệp vụ.
const KERNEL = new Set(["organization", "assets", "audit", "jobs", "usage", "storage", "notification", "subscription", "platform", "profiles", "integration-hub", "field-platform"])

// ── 5. Xuất ──────────────────────────────────────────────────────────────────
if (mode === "summary") {
  console.log(`tệp: ${files.length} (prod ${prod.length}, test ${files.length - prod.length})`)
  console.log(`tệp > 350 dòng (prod): ${prod.filter(([, n]) => n.lines > 350).length}`)
  console.log(`tệp "use client": ${prod.filter(([, n]) => n.client).length}`)
  for (const [k, v] of Object.entries(V).sort()) console.log(String(v.length).padStart(5), k)
  const fc = scc(edgesBy(fileOf)), fa = scc(edgesBy(fileOf, { runtime: false }))
  console.log(`vòng cấp tệp (runtime): ${fc.length} [${fc.map((c) => c.length)}] · kể cả import type: ${fa.length}`)
  const mc = scc(edgesBy(modOf))
  console.log(`vòng cấp module (runtime): ${mc.map((c) => c.length + " module")}`)
} else if (mode === "violations") {
  for (const x of V[arg] ?? []) console.log(x)
} else if (mode === "cycles") {
  for (const c of scc(edgesBy(fileOf))) console.log(`[${c.length}]\n  ${c.join("\n  ")}`)
} else if (mode === "modules") {
  const e = edgesBy(modOf)
  const pairs = []
  for (const a in e) for (const b of e[a]) if (a < b && e[b]?.includes(a)) pairs.push(`${a} <-> ${b}`)
  const fanIn = {}
  for (const a in e) for (const b of e[a]) fanIn[b] = (fanIn[b] ?? 0) + 1
  console.log(`cặp module phụ thuộc hai chiều (runtime): ${pairs.length}\n  ${pairs.join("\n  ")}`)
  console.log("fan-out:", Object.entries(e).map(([k, v]) => [k, v.length]).sort((x, y) => y[1] - x[1]).slice(0, 10))
  console.log("fan-in:", Object.entries(fanIn).sort((x, y) => y[1] - x[1]).slice(0, 10))
} else if (mode === "upward") {
  const cut = []
  const e = edgesBy(modOf, { skip: (a, b) => KERNEL.has(a) && !KERNEL.has(b) && cut.push(`${a} -> ${b}`) })
  console.log(`cạnh nhân → nghiệp vụ bị cắt (cặp module): ${[...new Set(cut)].join(", ")}`)
  for (const [f, n] of prod) {
    const a = modOf(f)
    if (!a || !KERNEL.has(a)) continue
    for (const d of n.deps) if (d.to && !d.typeOnly && modOf(d.to) && !KERNEL.has(modOf(d.to))) console.log(`  ${f} -> ${d.to}`)
  }
  for (const c of scc(e)) console.log(`SCC còn lại [${c.length}]: ${c.join(", ")}`)
} else if (mode === "writers") {
  const models = new Set([...fs.readFileSync("prisma/schema.prisma", "utf8").matchAll(/^model (\w+)/gm)].map((m) => m[1]))
  const w = {}
  for (const [f] of prod) {
    const owner = modOf(f) ?? classify(f).mod
    for (const m of fs.readFileSync(f, "utf8").matchAll(/\.(\w+)\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/g))
      if (models.has(m[1])) (w[m[1]] ??= new Set()).add(owner)
  }
  const multi = Object.entries(w).filter(([, s]) => s.size > 1).sort((x, y) => y[1].size - x[1].size)
  console.log(`bảng được ghi: ${Object.keys(w).length} · bảng có >1 module ghi: ${multi.length}`)
  for (const [t, s] of multi.filter(([, s]) => s.size >= 3)) console.log(`  ${s.size}  ${t}: ${[...s].sort().join(", ")}`)
}
