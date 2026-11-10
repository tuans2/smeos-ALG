import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { acceptedViolations, loadManifest, renderReport, renderRoutes, reportFile, routesFile } from "./gen-phase-routes"
import { tracePhase } from "./trace-phase"

/**
 * Ghi lại danh sách route và báo cáo phụ thuộc của một giai đoạn bàn giao.
 *
 *   npm run release:routes            # ghi lại hai tệp (mặc định gd1)
 *   npm run release:routes -- --check # báo lỗi nếu tệp đã cũ hoặc có phụ thuộc mới vào vùng không giao (CI)
 */
const ROOT = process.cwd()

function main(): void {
  const phase = process.argv.slice(2).find((arg) => !arg.startsWith("-")) ?? "gd1"
  const check = process.argv.includes("--check")
  const manifest = loadManifest(ROOT, phase)
  const trace = tracePhase(ROOT, manifest)
  const accepted = acceptedViolations(manifest)
  const outputs = [
    [routesFile(phase), renderRoutes(phase, trace)],
    [reportFile(phase), renderReport(phase, trace, accepted)],
  ] as const
  const stale = outputs.filter(([file, content]) => {
    try {
      return readFileSync(path.join(ROOT, file), "utf8") !== content
    } catch {
      return true
    }
  })
  const fresh = trace.violations.filter((v) => !accepted.has(`${v.from} → ${v.to}`))
  if (check) {
    for (const [file] of stale) console.error(`[release:routes] ${file} đã cũ — chạy npm run release:routes`)
    for (const v of fresh) console.error(`[release:routes] phụ thuộc vùng không giao: ${v.from} → ${v.to}`)
    process.exit(stale.length || fresh.length ? 1 : 0)
  }
  for (const [file, content] of outputs) writeFileSync(path.join(ROOT, file), content)
  console.log(`[release:routes] ${phase}: ${trace.pages.length} trang, ${trace.apis.length} API, ${trace.files.length} tệp`)
  for (const v of fresh) console.warn(`[release:routes] phụ thuộc mới chưa ghi nhận: ${v.from} → ${v.to}`)
}

main()
