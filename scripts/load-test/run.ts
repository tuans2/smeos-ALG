/**
 * Đo thử tải (ADR-015 D-O7, bước O-9) trên dữ liệu của `npm run load:seed` — CHỈ trên CSDL tạm:
 *   npm run load:run                              (mỗi kịch bản 200 lần, 10 luồng song song)
 *   npm run load:run -- --samples 500 --concurrency 20
 * Gọi thẳng use-case trong ngữ cảnh tổ chức (`withTenantDb`, cùng đường RLS với request), đo p50 / p95 / p99, so với mục
 * tiêu D-O1 (p95 ≤ 200 ms; báo cáo ≤ 2 s). In bảng Markdown và ghi `scripts/load-test/.result.md` để dán vào biên bản
 * (`VAN_HANH_SU_CO_VA_SAO_LUU.md` §5). Mã thoát 1 khi có kịch bản không đạt.
 */
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import type { TenantContext } from "@/core/tenancy"
import { resultTable, summarize, type ScenarioResult } from "@/core/runtime/load-test"
import { withTenantDb } from "@/core/tenancy/db-context"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"
import { listCoordinationQueue } from "@/modules/orders/use-cases/list-coordination-queue"
import { listOrders } from "@/modules/orders/use-cases/list-orders"
import { WorkspaceRepository } from "@/modules/organization/infra/workspace-repository"
import { getRevenueReport } from "@/modules/reporting/use-cases/reports"

import { assertLoadTestDatabase } from "./guard"

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? Number(process.argv[i + 1]) : fallback
}
const SAMPLES = arg("samples", 200)
const CONCURRENCY = arg("concurrency", 10)

interface Seeded { organizationId: string; userId: string }

async function contextOf(t: Seeded): Promise<TenantContext> {
  const workspace = await withTenantDb(t.organizationId, () => new WorkspaceRepository().findDefaultForSessionOrganization(t.organizationId))
  if (!workspace) throw new Error("Tổ chức thử tải thiếu workspace")
  // Quyền đủ cho các use-case được đo (đọc đơn, điều phối, báo cáo, tạo đơn) — bỏ qua lớp HTTP, không bỏ qua RLS.
  return { organizationId: t.organizationId, workspaceId: workspace.id, userId: t.userId, branchId: null, capabilities: new Set(["R1", "R2", "R20", "M10", "F1"]) }
}

async function measure(name: string, targetP95: number, pick: () => TenantContext, op: (ctx: TenantContext) => Promise<unknown>): Promise<ScenarioResult> {
  const durations: number[] = []
  let errors = 0
  let next = 0
  let firstError: string | null = null
  const worker = async () => {
    while (next < SAMPLES) {
      next++
      const ctx = pick()
      const t0 = performance.now()
      try {
        await withTenantDb(ctx.organizationId, () => op(ctx))
        durations.push(performance.now() - t0)
      } catch (error) {
        errors++
        firstError ??= error instanceof Error ? error.message : String(error)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  if (firstError) console.error(`  ${name}: ${errors} lỗi, lỗi đầu: ${firstError}`)
  return summarize(name, durations, errors, targetP95)
}

async function main() {
  const db = assertLoadTestDatabase()
  const seed = JSON.parse(readFileSync(path.join(process.cwd(), "scripts/load-test/.seed.json"), "utf8")) as { db: string; scale: number; chain: Seeded; shops: Seeded[] }
  if (seed.db !== db) throw new Error(`Dữ liệu thử tải sinh trên ${seed.db}, đang trỏ ${db}`)
  const chain = await contextOf(seed.chain)
  const shops = await Promise.all(seed.shops.map(contextOf))
  const anyShop = () => shops[Math.floor(Math.random() * shops.length)]!
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  const item = { description: "Bó hoa thử tải", quantity: 1, unitPriceVnd: 350_000 }

  console.log(`CSDL ${db} · ${SAMPLES} lần × ${CONCURRENCY} luồng mỗi kịch bản`)
  const results = [
    await measure("Đặt đơn — chuỗi", 200, () => chain, (ctx) => ingestOrder(ctx, { source: "MANUAL", items: [item] })),
    await measure("Đặt đơn — tiệm lẻ", 200, anyShop, (ctx) => ingestOrder(ctx, { source: "MANUAL", items: [item] })),
    await measure("Danh sách đơn — chuỗi", 200, () => chain, (ctx) => listOrders(ctx, {})),
    await measure("Danh sách đơn — tiệm lẻ", 200, anyShop, (ctx) => listOrders(ctx, {})),
    await measure("Hàng điều phối — chuỗi", 200, () => chain, (ctx) => listCoordinationQueue(ctx)),
    await measure("Báo cáo doanh thu 30 ngày — chuỗi", 2000, () => chain, (ctx) => getRevenueReport(ctx, { from: monthAgo, to: today })),
  ]
  const header = `Thử tải ${new Date().toISOString()} · CSDL ${db} · quy mô ${seed.scale} · ${shops.length} tiệm lẻ · ${SAMPLES} lần × ${CONCURRENCY} luồng`
  const report = `${header}\n\n${resultTable(results)}\n`
  writeFileSync(path.join(process.cwd(), "scripts/load-test/.result.md"), report)
  console.log(`\n${report}`)
  if (results.some((r) => !r.pass)) process.exitCode = 1
}

main().then(() => process.exit(process.exitCode ?? 0), (error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
