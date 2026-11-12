#!/usr/bin/env node
// Đối chiếu đặc tả 06/07 với mã thật. Chạy: node scripts/check-docs.mjs
// Sinh ra ở lượt rà soát 18/09 — xem docs/kien-truc/RA_SOAT_DONG_BO_18_09.md.
// Ý tưởng: tài liệu không tự nhớ con số; CI đọc mã rồi so lại.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const CHUA_XAY = /CHƯA XÂY|chưa gác|chưa xây/i
let loi = 0
const bao = (m) => { console.error("  ✗ " + m); loi++ }

// ── 1. Endpoint ────────────────────────────────────────────────────────────
const spec = readFileSync("docs/dac-ta/06-api-specification.md", "utf8")
const specEps = new Map()
for (const line of spec.split("\n")) {
  if (!line.startsWith("|")) continue
  const c = line.replace(/^\||\|$/g, "").split("|").map((x) => x.trim())
  if (c.length < 2) continue
  for (const m of c[0].toUpperCase().split("·").map((x) => x.trim())) {
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(m)) continue
    const p = c[1].replace(/`/g, "").replace("/api/v1", "").trim()
    if (p.startsWith("/")) specEps.set(`${m} ${p}`, c[2] ?? "")
  }
}
const codeEps = new Set()
// Mã năng lực ghi thẳng trong từng handler: `requireCapability(ctx, "L2")` (audit API-12, 07/11/2026)
const codeCaps = new Map()
const MA_NANG_LUC = /\b[A-Z]{1,2}\d{1,2}[a-z]?\b/g
const dive = (dir) => {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e)
    if (statSync(f).isDirectory()) dive(f)
    else if (e === "route.ts") {
      const rel = dir.replace("src/app/api/v1", "").replace(/\[\.\.\.(\w+)\]/g, ":$1").replace(/\[(\w+)\]/g, ":$1")
      const src = readFileSync(f, "utf8")
      for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g))
        codeEps.add(`${m[1]} ${rel}`)
      for (const phan of src.split(/(?=export\s+(?:async\s+)?(?:function|const)\s+(?:GET|POST|PUT|PATCH|DELETE)\b)/)) {
        const m = phan.match(/^export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/)
        if (!m) continue
        const ma = [...phan.matchAll(/requireCapability\(\s*\w+\s*,\s*["']([A-Z]{1,2}\d{1,2}[a-z]?)["']/g)].map((x) => x[1])
        if (ma.length) codeCaps.set(`${m[1]} ${rel}`, new Set(ma))
      }
      // Route chỉ re-export handler (`export { fooPOST as POST }`) — trước 05/10/2026 lọt khỏi phép dò.
      for (const m of src.matchAll(/export\s*\{([^}]*)\}/g))
        for (const n of m[1].matchAll(/\bas\s+(GET|POST|PUT|PATCH|DELETE)\b/g)) codeEps.add(`${n[1]} ${rel}`)
    }
  }
}
dive("src/app/api/v1")
const chuan = (k) => k.replace(/:\w+/g, "{}").replace(/\/$/, "")
const codeN = new Set([...codeEps].map(chuan))
const specN = new Map([...specEps].map(([k, v]) => [chuan(k), v]))

console.log("── Endpoint")
for (const [k, cap] of specN) if (!codeN.has(k) && !CHUA_XAY.test(cap)) bao(`đặc tả 06 có "${k}" nhưng không có route — thêm route, hoặc đánh dấu **CHƯA XÂY** ở cột năng lực`)
for (const k of codeN) if (!specN.has(k)) bao(`route "${k}" không có trong đặc tả 06`)

// Cột năng lực: mã mà handler gọi `requireCapability` phải có trong cột năng lực của đặc tả 06 (khi
// cột có ghi mã). Trước 07/11/2026 chỉ đối chiếu path + method nên 8 dòng lệch không ai thấy (audit
// API-12). Các dòng đó chờ PO chốt mã hay đặc tả đúng — danh sách này chỉ được co lại.
const NANG_LUC_LECH_CHO_PO = new Set([]) // PO chốt 8 dòng ngày 07/11/2026 (audit API-12) — đặc tả theo mã
console.log("── Cột năng lực")
const lech = new Set()
for (const [k, ma] of codeCaps) {
  const cot = specN.get(chuan(k))
  if (cot === undefined) continue
  const maDacTa = new Set(cot.match(MA_NANG_LUC) ?? [])
  if (maDacTa.size === 0) continue
  const thieu = [...ma].filter((x) => !maDacTa.has(x))
  if (thieu.length === 0) continue
  lech.add(chuan(k))
  if (!NANG_LUC_LECH_CHO_PO.has(chuan(k))) bao(`"${chuan(k)}": mã gọi ${thieu.join(", ")} nhưng đặc tả 06 ghi ${[...maDacTa].join(", ")} — sửa đặc tả hoặc mã`)
}
for (const k of NANG_LUC_LECH_CHO_PO) if (!lech.has(k)) bao(`NANG_LUC_LECH_CHO_PO còn giữ "${k}" dù đã khớp — xoá khỏi danh sách`)

// ── 2. Bảng và enum ────────────────────────────────────────────────────────
const doc = readFileSync("docs/dac-ta/07-database-specification.md", "utf8")
const schema = readFileSync("prisma/schema.prisma", "utf8")
const models = (t) => {
  const o = new Map()
  for (const m of t.matchAll(/\bmodel\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const map = m[2].match(/@@map\("([^"]+)"\)/)
    o.set(map ? map[1] : m[1], m[2])
  }
  return o
}
const enums = (t) => {
  const o = new Map()
  for (const m of t.matchAll(/\benum\s+(\w+)\s*\{([\s\S]*?)\}/g))
    o.set(m[1], [...m[2].matchAll(/\b([A-Z][A-Z0-9_]*)\b/g)].map((x) => x[1]).sort().join(" "))
  return o
}
const dm = models(doc), sm = models(schema), de = enums(doc), se = enums(schema)
const docChuaXay = (n) => new RegExp(`CHƯA XÂY[\\s\\S]{0,200}model\\s+${n}\\b`).test(doc)

console.log("── Bảng")
for (const n of dm.keys()) if (!sm.has(n) && !docChuaXay(n)) bao(`đặc tả 07 khai model "${n}" nhưng lược đồ không có — đánh dấu CHƯA XÂY hoặc bỏ`)
for (const n of sm.keys()) if (!dm.has(n)) bao(`lược đồ có model "${n}" nhưng đặc tả 07 không khai`)

console.log("── Enum")
for (const [n, v] of de) {
  if (!se.has(n)) { bao(`đặc tả 07 khai enum "${n}" nhưng lược đồ không có`); continue }
  if (se.get(n) !== v) bao(`enum "${n}" lệch giá trị — đặc tả: ${v} · lược đồ: ${se.get(n)}`)
}
for (const n of se.keys()) if (!de.has(n)) bao(`lược đồ có enum "${n}" nhưng đặc tả 07 không khai`)

// ── 3. Cách ly tenant ──────────────────────────────────────────────────────
console.log("── Cách ly tenant")
// Bảng có `organization_id` trong lược đồ nhưng KHÔNG có route/use-case nào
// từng ghi vào — soát RS-2 18/09 xác nhận bằng tay, không suy luận tự động
// (đọc mã, không phải một dấu hiệu trong tài liệu). Viết ca thử cách ly cho
// một bảng chết là thử một thứ không tồn tại; danh sách này CHỈ được thêm
// sau khi đọc mã xác nhận, và phải bỏ bớt ngay khi bảng có đường ghi thật.
const SCHEMA_ONLY_CHUA_NOI = new Set([
  "product_variants", // product-master-index-repository.ts: "chưa từng được nối"
  "product_images", // product-master-index-repository.ts: "chưa từng được nối"
  "product_inventory", // nợ #95: "chưa được nối"
  "journey_runs", // 05/10/2026: grep src/ không có đường đọc/ghi nào — bảng Journey Engine mới khai ở lược đồ
])
const tenant = [...sm].filter(([, b]) => /^\s*organization_id\s/m.test(b)).map(([n]) => n).filter((n) => !SCHEMA_ONLY_CHUA_NOI.has(n))
const thu = readdirSync("tests/tenant").filter((f) => f.endsWith(".ts"))
  .map((f) => readFileSync(join("tests/tenant", f), "utf8")).join("")
const camel = (n) => n.split("_").map((x, i) => (i ? x[0].toUpperCase() + x.slice(1) : x)).join("")
// Bảng thật SỰ có ca thử cách ly, nhưng ca thử gọi qua route công khai
// (đường dẫn HTTP, tên use-case) chứ không bao giờ gõ lại tên bảng snake_case
// — dò chữ đơn thuần bên dưới không thấy được. Xác nhận bằng tay từng dòng,
// trỏ thẳng vào ca thử thật, để không lặp lại kiểu "coi như xong" mà đợt RS-2
// 18/09 vừa sửa (16 bảng tưởng thiếu, hoá ra 8 trong số đó đã có ca thử).
const COVERED_VIA_ROUTE = {
  pricing_rules: "tests/tenant/products-pricing.test.ts — PUT/GET /pricing-rules",
  catalog_links: "tests/tenant/catalog-links.test.ts",
  order_items: "tests/tenant/order-isolation.test.ts — POST/GET /orders (items)",
  order_events: "tests/tenant/order-isolation.test.ts — GET /orders/:id/events",
  customer_occasions: "tests/tenant/customer-isolation.test.ts — POST .../occasions",
  chat_conversations: "tests/tenant/chat-isolation.test.ts",
  chat_messages: "tests/tenant/chat-isolation.test.ts",
  chat_channel_integrations: "tests/tenant/chat-channel-isolation.test.ts",
  order_qc_records: "tests/tenant/coordinator.test.ts — POST /coordinator/orders/:id/qc",
  order_exceptions: "tests/tenant/coordinator.test.ts — resolve sự cố của tổ chức khác → 404",
  order_payments: "tests/tenant/coordinator.test.ts — sổ thu: cách ly tổ chức — tổ chức khác không đọc/ghi được (404)",
  internal_chat_conversations: "tests/tenant/internal-chat-isolation.test.ts — đọc/gửi/tham gia hội thoại tổ chức khác → 404",
  customer_segments: "tests/tenant/customer-care-isolation.test.ts — xem/sửa/xoá nhóm khách của tổ chức khác → 404",
  customer_interactions: "tests/tenant/customer-care-isolation.test.ts — nhật ký tương tác cách ly, không ghi được cho khách tổ chức khác",
}
for (const t of tenant) {
  if (t in COVERED_VIA_ROUTE) continue
  const dang = [t, camel(t), t.replace(/s$/, ""), camel(t.replace(/s$/, ""))]
  if (!dang.some((d) => thu.includes(d))) bao(`bảng tenant "${t}" không có ca thử cách ly nào (đặc tả 07 mục 19)`)
}
// TENANT_TABLES = sổ sinh từ schema (ADR-016 S-1) + bảng thêm trong helper — đọc cả hai.
const helper = readFileSync("tests/helpers/database.ts", "utf8") + readFileSync("src/core/tenancy/generated/tenant-table-registry.ts", "utf8")
const trunc = new Set([...helper.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]))
for (const t of tenant) if (!trunc.has(t)) bao(`bảng tenant "${t}" không nằm trong TENANT_TABLES — không được dọn giữa các ca thử`)

// @release-strip — tài liệu cho agent (CLAUDE.md, .agents/) là nội bộ smeOS, không có trong bản giao GD1
// ── 4. Tài liệu cho agent ─────────────────────────────────────────────────
// CLAUDE.md nạp vào MỌI phiên — giữ nhỏ. Đường dẫn/lệnh trong tài liệu agent
// phải có thật: link `file://` tuyệt đối tới máy cá nhân bị hỏng và `HARVEST_MANIFEST.md` sai chỗ
// từng nằm đó mà không ai biết (05/10/2026).
console.log("── Tài liệu cho agent")
const CLAUDE_MD_MAX = 6144
const claudeMd = readFileSync("CLAUDE.md", "utf8")
if (Buffer.byteLength(claudeMd) > CLAUDE_MD_MAX)
  bao(`CLAUDE.md ${Buffer.byteLength(claudeMd)} byte > ${CLAUDE_MD_MAX} — chuyển chi tiết sang skill/tài liệu tham chiếu`)
const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts
// .agents/ không còn trong git (.gitignore — chủ sản phẩm giữ riêng); chỉ kiểm khi có trên máy
const hasAgents = existsSync(".agents/skills")
const agentDocs = ["CLAUDE.md", ...(hasAgents ? [".agents/AGENT_RULES.md",
  ...readdirSync(".agents/skills").map((d) => `.agents/skills/${d}/SKILL.md`)] : [])]
for (const f of agentDocs) {
  const t = readFileSync(f, "utf8")
  for (const m of t.matchAll(/npm run ([\w:.-]+)/g)) if (!(m[1] in scripts)) bao(`${f}: "npm run ${m[1]}" không có trong package.json`)
  for (const m of t.matchAll(/`((?:src|tests|scripts|workers|prisma|docs|\.agents|\.claude)\/[^`\s*{}<>|]+?)`/g)) {
    const pth = m[1].replace(/[:#].*$/, "").replace(/\/$/, "")
    // .claude/skills là symlink tới .agents/skills
    if (!hasAgents && (pth.startsWith(".agents/") || pth.startsWith(".claude/skills"))) continue
    if (!existsSync(pth)) bao(`${f}: đường dẫn \`${m[1]}\` không tồn tại`)
  }
  for (const m of t.matchAll(/\]\(((?!https?:|#)[^)\s]+)\)/g)) {
    if (m[1].startsWith("file:")) { bao(`${f}: link tuyệt đối "${m[1]}" — dùng đường dẫn tương đối`); continue }
    const pth = join(f.includes("/") ? f.slice(0, f.lastIndexOf("/")) : ".", m[1].replace(/#.*$/, ""))
    if (!existsSync(pth)) bao(`${f}: link "${m[1]}" không tồn tại`)
  }
}
// @release-strip-end

console.log(loi === 0 ? "\n✓ Tài liệu khớp mã." : `\n✗ ${loi} chỗ lệch giữa tài liệu và mã.`)
process.exit(loi === 0 ? 0 : 1)
