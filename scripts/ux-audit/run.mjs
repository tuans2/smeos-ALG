// npm run ux:audit -- <kịch bản | /đường-dẫn>
//   kịch bản: tên tệp trong scripts/ux-audit/scenarios/ (vd. the-chao) — đi qua mọi trạng thái của trang
//   /đường-dẫn: chỉ chụp trạng thái mở trang (điểm khởi đầu khi chưa có kịch bản — hãy viết kịch bản đủ trạng thái)
// Cần: dev server chạy với DATABASE_URL trỏ database *_test (UX_AUDIT_BASE_URL, mặc định http://localhost:3200).
import { writeFileSync } from "node:fs"
import { login, open, shot, OUT } from "./lib.mjs"

const target = process.argv[2]
if (!target) {
  console.error("Cách dùng: npm run ux:audit -- <kịch bản | /đường-dẫn>")
  process.exit(2)
}

const scenario = target.startsWith("/")
  ? { flags: [], run: async ({ page, shot: s }) => s("mo-trang", (p) => open(p, target)) }
  : await import(`./scenarios/${target}.mjs`)

const ctx = await login({ flags: scenario.flags ?? [] })
const results = []
try {
  await scenario.run({ ...ctx, open, shot: async (name, prep) => { const r = await shot(ctx.page, name, prep); results.push(...r); return r } })
} finally {
  await ctx.browser.close()
}

const report = [`# UX audit — ${target}`, "", `Ảnh: \`${OUT}/\` (390px, 1280px). axe sạch không đồng nghĩa đạt WCAG — ghi rõ phần kiểm thủ công.`, "", ...results.map((r) => `- ${r.failed ? "✗" : "✓"} ${r.line}`)].join("\n")
writeFileSync(`${OUT}/report.md`, report + "\n")
console.log(report)
process.exit(results.some((r) => r.failed) ? 1 : 0)
