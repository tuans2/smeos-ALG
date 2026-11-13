/**
 * check-screen-contracts.ts
 *
 * Kiểm tra tính đầy đủ và tính tuân thủ của Screen Contract v2 theo quyết định
 * kiến trúc ADR-011 D-UI-08 và chỉ số DoD K6 (docs/plan/ui-enterprise-upgrade.md).
 *
 * Cách dùng:
 *   npx tsx scripts/check-screen-contracts.ts
 *   npx tsx scripts/check-screen-contracts.ts --json
 *   npx tsx scripts/check-screen-contracts.ts --generate-e2e-list
 *   npx tsx scripts/check-screen-contracts.ts --check
 */

import { readdirSync, readFileSync, existsSync } from "node:fs"
import { join, relative } from "node:path"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import yaml from "js-yaml"

const REPO_ROOT = join(__dirname, "..")
const APP_DIR = join(REPO_ROOT, "src/app")
const CONTRACTS_DIR = join(REPO_ROOT, "docs/dac-ta/screen-contracts")
const EXEMPTIONS_FILE = join(CONTRACTS_DIR, "_exemptions.yaml")

export interface ContractFrontMatter {
  id: string
  tier: "MOTHER" | "INDUSTRY" | "CHAIN" | "STORE" | "PUBLIC" | "AUTH"
  module: string
  route: string
  archetype: "A" | "B" | "C" | "D" | "E" | "F"
  snapshots?: string[] | undefined
  acceptance?: string[] | undefined
}

export interface RouteStatus {
  pagePath: string
  route: string
  status: "CONTRACT_V2" | "CONTRACT_V1" | "EXEMPT" | "MISSING"
  contractFile?: string | undefined
  frontMatter?: ContractFrontMatter | undefined
  errors?: string[] | undefined
  reason?: string | undefined
}

function findPageFiles(dir: string): string[] {
  const pages: string[] = []
  if (!existsSync(dir)) return pages

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== "api" && entry.name !== "node_modules") {
        pages.push(...findPageFiles(full))
      }
    } else if (entry.name === "page.tsx") {
      pages.push(full)
    }
  }
  return pages
}

function normalizeRoute(pagePath: string): string {
  const rel = relative(APP_DIR, pagePath).replace(/\\/g, "/")
  const withoutPage = rel.replace(/\/page\.tsx$/, "")
  // Bỏ route groups như (app), (platform), (auth)
  const cleaned = withoutPage.replace(/\([^)]+\)\/?/g, "")
  return cleaned === "" ? "/" : cleaned.startsWith("/") ? cleaned : `/${cleaned}`
}

function loadExemptions(): Map<string, string> {
  const map = new Map<string, string>()
  if (!existsSync(EXEMPTIONS_FILE)) return map
  try {
    const content = readFileSync(EXEMPTIONS_FILE, "utf-8")
    const parsed = yaml.load(content) as { exemptions?: Array<{ route: string; reason: string }> }
    if (parsed && Array.isArray(parsed.exemptions)) {
      for (const item of parsed.exemptions) {
        map.set(item.route, item.reason)
      }
    }
  } catch {
    // Không ném lỗi
  }
  return map
}

function parseFrontMatter(content: string): { frontMatter?: ContractFrontMatter; errors: string[] } {
  const errors: string[] = []
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match || !match[1]) {
    errors.push("Thiếu khối YAML front-matter chuẩn v2 (--- ... ---)")
    return { errors }
  }

  try {
    const raw = yaml.load(match[1]) as Record<string, unknown>
    if (!raw || typeof raw !== "object") {
      errors.push("Cấu trúc YAML front-matter không hợp lệ")
      return { errors }
    }

    const { id, tier, module, route, archetype, snapshots, acceptance } = raw as Partial<ContractFrontMatter>
    if (!id || typeof id !== "string") errors.push("Thiếu trường 'id'")
    else if (!id.startsWith("SCR-")) errors.push(`Trường 'id' (${id}) phải bắt đầu bằng SCR-<TIER>-<slug>`)

    const validTiers = ["MOTHER", "INDUSTRY", "CHAIN", "STORE", "PUBLIC", "AUTH"]
    if (!tier || !validTiers.includes(tier)) errors.push(`Trường 'tier' (${tier}) không hợp lệ (phải thuộc ${validTiers.join(", ")})`)

    if (!module || typeof module !== "string") errors.push("Thiếu trường 'module'")
    if (!route || typeof route !== "string") errors.push("Thiếu trường 'route'")

    const validArchetypes = ["A", "B", "C", "D", "E", "F"]
    if (!archetype || !validArchetypes.includes(archetype)) errors.push(`Trường 'archetype' (${archetype}) phải thuộc A–F`)

    if (errors.length > 0) return { errors }

    return {
      frontMatter: {
        id: id!,
        tier: tier!,
        module: module!,
        route: route!,
        archetype: archetype!,
        snapshots: Array.isArray(snapshots) ? (snapshots as string[]) : undefined,
        acceptance: Array.isArray(acceptance) ? (acceptance as string[]) : undefined,
      },
      errors: [],
    }
  } catch (err) {
    errors.push(`Lỗi cú pháp YAML: ${(err as Error).message}`)
    return { errors }
  }
}

export function runContractCheck(): {
  results: RouteStatus[]
  totalRoutes: number
  coveredV2: number
  coveredV1: number
  exempt: number
  missing: number
  coveragePercent: number
} {
  const pages = findPageFiles(APP_DIR)
  const exemptions = loadExemptions()

  // Đọc danh mục contracts
  const contracts: Array<{ file: string; content: string; frontMatter?: ContractFrontMatter; errors: string[] }> = []
  if (existsSync(CONTRACTS_DIR)) {
    for (const f of readdirSync(CONTRACTS_DIR)) {
      if (f.endsWith(".md") && !f.startsWith("_TEMPLATE") && !f.startsWith("README")) {
        const full = join(CONTRACTS_DIR, f)
        const content = readFileSync(full, "utf-8")
        const parsed = parseFrontMatter(content)
        contracts.push({ file: f, content, ...parsed })
      }
    }
  }

  const results: RouteStatus[] = []

  for (const page of pages) {
    const route = normalizeRoute(page)
    const relPage = relative(REPO_ROOT, page).replace(/\\/g, "/")

    if (exemptions.has(route)) {
      results.push({
        pagePath: relPage,
        route,
        status: "EXEMPT",
        reason: exemptions.get(route),
      })
      continue
    }

    // Tìm contract v2 qua frontMatter.route
    const v2Contract = contracts.find((c) => c.frontMatter && c.frontMatter.route === route)
    if (v2Contract && v2Contract.frontMatter) {
      results.push({
        pagePath: relPage,
        route,
        status: "CONTRACT_V2",
        contractFile: v2Contract.file,
        frontMatter: v2Contract.frontMatter,
        errors: v2Contract.errors,
      })
      continue
    }

    // Tìm contract v1 (file markdown có nhắc tới route hoặc tên slug)
    const slug = route.split("/").filter(Boolean)[0] || "index"
    const v1Contract = contracts.find((c) => {
      const baseName = c.file.replace(/\.md$/, "")
      return baseName === slug || c.content.includes(`**Tuyến:** \`${route}\``)
    })

    if (v1Contract) {
      results.push({
        pagePath: relPage,
        route,
        status: "CONTRACT_V1",
        contractFile: v1Contract.file,
        errors: v1Contract.errors,
      })
      continue
    }

    results.push({
      pagePath: relPage,
      route,
      status: "MISSING",
    })
  }

  const total = results.length
  const coveredV2 = results.filter((r) => r.status === "CONTRACT_V2").length
  const coveredV1 = results.filter((r) => r.status === "CONTRACT_V1").length
  const exempt = results.filter((r) => r.status === "EXEMPT").length
  const missing = results.filter((r) => r.status === "MISSING").length
  const nonExemptTotal = total - exempt
  const coveragePercent = nonExemptTotal > 0 ? Math.round(((coveredV2 + coveredV1) / nonExemptTotal) * 100) : 100

  return {
    results,
    totalRoutes: total,
    coveredV2,
    coveredV1,
    exempt,
    missing,
    coveragePercent,
  }
}

/**
 * Lý do làm `--check` đỏ (ADR-011 D-UI-08: mọi page.tsx cần contract v2 hoặc miễn trừ).
 * Trang chỉ khớp contract v1 (theo tên tệp/nhắc tuyến) cũng đỏ — trước đây mất front-matter v2
 * thì trang lặng lẽ rơi về v1 và cổng vẫn đạt.
 */
export function contractCheckFailures(report: { missing: number; coveredV1: number }): string[] {
  const out: string[] = []
  if (report.missing > 0) out.push(`Phát hiện ${report.missing} trang chưa có Screen Contract!`)
  if (report.coveredV1 > 0) out.push(`Phát hiện ${report.coveredV1} trang chỉ có Screen Contract v1 — cần front-matter v2.`)
  return out
}

function main() {
  const args = process.argv.slice(2)
  const isJson = args.includes("--json")
  const isGenE2E = args.includes("--generate-e2e-list")
  const isCheck = args.includes("--check")

  const report = runContractCheck()

  if (isJson) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  if (isGenE2E) {
    const e2eRoutes = report.results
      .filter((r) => r.status === "CONTRACT_V2" || r.status === "CONTRACT_V1")
      .map((r) => ({
        route: r.route,
        archetype: r.frontMatter?.archetype ?? "A",
        snapshots: r.frontMatter?.snapshots ?? ["390x844", "1280x800"],
      }))
    console.log(JSON.stringify(e2eRoutes, null, 2))
    return
  }

  console.log("\n==================== SCREEN CONTRACT COVERAGE AUDIT ====================")
  console.log(`Tổng số trang giao diện (page.tsx): ${report.totalRoutes}`)
  console.log(`✅ Đã có Screen Contract v2:      ${report.coveredV2}`)
  console.log(`🟡 Đang dùng Screen Contract v1:   ${report.coveredV1}`)
  console.log(`⚪ Thuộc diện miễn trừ (_exempt):   ${report.exempt}`)
  console.log(`❌ Chưa có Screen Contract:       ${report.missing}`)
  console.log(`📊 Tỷ lệ bao phủ hợp đồng:        ${report.coveragePercent}%`)
  console.log("========================================================================\n")

  if (report.missing > 0) {
    console.log("Danh sách các trang chưa có Screen Contract:")
    for (const r of report.results.filter((res) => res.status === "MISSING").slice(0, 15)) {
      console.log(`  - [${r.route}] (${r.pagePath})`)
    }
    if (report.missing > 15) {
      console.log(`  ... và ${report.missing - 15} trang khác.`)
    }
    console.log("\n💡 Để thêm contract v2: sao chép docs/dac-ta/screen-contracts/_TEMPLATE_V2.md")
    console.log("💡 Nếu trang được miễn trừ: khai báo vào docs/dac-ta/screen-contracts/_exemptions.yaml")
  }

  const failures = isCheck ? contractCheckFailures(report) : []
  if (failures.length > 0) {
    for (const f of failures) console.error(`\n❌ [FAIL] ${f}`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
