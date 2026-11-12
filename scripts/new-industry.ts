/**
 * new-industry.ts — Wizard tự động tạo ngành mới theo chuẩn SSOT
 *
 * Thực hiện đúng 3 bước trong AGENTS.md § Quy chuẩn Thêm Ngành Mới:
 *   Bước 1: Tạo file đặc tả ngành (src/modules/organization/domain/industries/<key>.ts)
 *   Bước 2: Đăng ký vào INDUSTRY_REGISTRY (index.ts + industry-profile.ts)
 *   Bước 3: Kiểm tra tự động (typecheck + contract test + audit)
 *
 * Cách chạy:
 *   npx tsx scripts/new-industry.ts
 *   npx tsx scripts/new-industry.ts --key=PET_CARE --name="Thú cưng & Pet shop" --dry-run
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { execSync } from "node:child_process"
import * as readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

const REPO_ROOT = join(__dirname, "..")
const INDUSTRIES_DIR = join(REPO_ROOT, "src/modules/organization/domain/industries")
const INDUSTRY_PROFILE_PATH = join(REPO_ROOT, "src/modules/organization/domain/industry-profile.ts")
const INDUSTRY_INDEX_PATH = join(INDUSTRIES_DIR, "index.ts")

// ─────────────────────────────────────────────
// STEP 1: Thu thập thông tin ngành
// ─────────────────────────────────────────────

interface IndustryInput {
  key: string        // VD: PET_CARE
  name: string       // VD: Thú cưng & Pet shop
  description: string
  iconName: string   // lucide-react icon
  makerTitle: string
  makerAction: string
  sampleProduct: string
  rawMaterialItem: string
  catalogTitle: string
  createButtonLabel: string
  scanButtonLabel: string
  defaultCategories: string[] // tối thiểu 3 danh mục
  occasions: string[]         // 3-5 dịp tặng
  marketingTone: string
  sampleProductNames: string[]
}

function parseArgs(): Partial<IndustryInput> & { dryRun: boolean; defaults: boolean } {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const found = args.find((a) => a.startsWith(`--${flag}=`))
    return found ? found.split("=").slice(1).join("=") : undefined
  }
  const result: Partial<IndustryInput> & { dryRun: boolean; defaults: boolean } = {
    dryRun: args.includes("--dry-run"),
    defaults: args.includes("--defaults") || args.includes("--yes") || args.includes("-y") || !process.stdin.isTTY,
  }
  const key = get("key")
  if (key !== undefined) result.key = key
  const name = get("name")
  if (name !== undefined) result.name = name
  return result
}

async function askQuestion(rl: readline.Interface | null, question: string, defaultVal?: string): Promise<string> {
  if (!rl) return defaultVal || ""
  const suffix = defaultVal ? ` [${defaultVal}]` : ""
  const answer = await rl.question(`  ${question}${suffix}: `)
  return answer.trim() || defaultVal || ""
}

async function collectIndustryInput(prefill: Partial<IndustryInput> & { defaults?: boolean }): Promise<IndustryInput> {
  const isAuto = Boolean(prefill.defaults)
  const rl = isAuto ? null : readline.createInterface({ input, output })

  console.log("\n🏭  WIZARD TẠO NGÀNH MỚI — ALG SSOT\n")
  console.log("─".repeat(60))
  if (!isAuto) {
    console.log("  Trả lời các câu hỏi dưới đây. Nhấn Enter để dùng giá trị mặc định.\n")
  } else {
    console.log("  [Chế độ tự động] Sử dụng thông tin mặc định theo chuẩn SSOT.\n")
  }

  const key = (prefill.key ?? await askQuestion(rl, "Mã ngành (UPPER_SNAKE_CASE, vd: PET_CARE)")).toUpperCase().replace(/\s+/g, "_")
  const name = prefill.name ?? await askQuestion(rl, "Tên ngành hiển thị", `${key} Industry`)
  const description = await askQuestion(rl, "Mô tả ngắn", `Cửa hàng chuyên về ${name}`)
  const iconName = await askQuestion(rl, "Icon Lucide (xem lucide.dev)", "ShoppingBag")
  
  console.log("\n  📝 Từ điển nghiệp vụ — điền theo ngôn ngữ của khách hàng ngành này:\n")
  const makerTitle = await askQuestion(rl, "Người thực hiện sản phẩm (makerTitle)", "Nhà sản xuất")
  const makerAction = await askQuestion(rl, "Hành động tạo sản phẩm (makerAction)", "Sản xuất")
  const sampleProduct = await askQuestion(rl, "Tên sản phẩm mẫu (sampleProduct)", "Mẫu sản phẩm")
  const rawMaterialItem = await askQuestion(rl, "Nguyên vật liệu chính (rawMaterialItem)", "Nguyên liệu")
  const catalogTitle = await askQuestion(rl, "Tên danh mục sản phẩm (catalogTitle)", `Kho ${sampleProduct}`)
  const createButtonLabel = await askQuestion(rl, "Nhãn nút tạo mới (createButtonLabel)", `Thêm ${sampleProduct}`)
  const scanButtonLabel = await askQuestion(rl, "Nhãn nút quét ảnh (scanButtonLabel)", `Quét ${sampleProduct}`)

  console.log("\n  📂 Danh mục sản phẩm (nhập từng loại, Enter trống để kết thúc):\n")
  const defaultCategories: string[] = []
  let catIdx = 1
  while (true) {
    const cat = await askQuestion(rl, `  Danh mục ${catIdx}`)
    if (!cat) break
    defaultCategories.push(cat)
    catIdx++
    if (catIdx > 8) break
  }
  if (defaultCategories.length === 0) defaultCategories.push(`${sampleProduct} tiêu chuẩn`, `${sampleProduct} cao cấp`, `${sampleProduct} đặt theo yêu cầu`)

  console.log("\n  🎉 Dịp / Occasion (nhập 3-5 dịp, Enter trống để kết thúc):\n")
  const occasions: string[] = []
  let occIdx = 1
  while (occasions.length < 5) {
    const occ = await askQuestion(rl, `  Dịp ${occIdx}`)
    if (!occ) break
    occasions.push(occ)
    occIdx++
  }
  if (occasions.length === 0) occasions.push("Sinh nhật", "Khai trương", "Tặng quà")

  const marketingTone = await askQuestion(rl, "\n  Tone marketing mẫu", `Sản phẩm ${name} chất lượng cao, giao hàng nhanh`)
  
  console.log("\n  📦 Tên sản phẩm mẫu (3 ví dụ, Enter trống để kết thúc):\n")
  const sampleProductNames: string[] = []
  while (sampleProductNames.length < 3) {
    const sp = await askQuestion(rl, `  Mẫu ${sampleProductNames.length + 1}`)
    if (!sp) break
    sampleProductNames.push(sp)
  }
  if (sampleProductNames.length === 0) sampleProductNames.push(`${sampleProduct} mẫu 1`, `${sampleProduct} mẫu 2`, `${sampleProduct} mẫu 3`)

  rl?.close()

  return {
    key,
    name,
    description,
    iconName,
    makerTitle,
    makerAction,
    sampleProduct,
    rawMaterialItem,
    catalogTitle,
    createButtonLabel,
    scanButtonLabel,
    defaultCategories,
    occasions,
    marketingTone,
    sampleProductNames,
  }
}

// ─────────────────────────────────────────────
// STEP 2: Sinh file ngành
// ─────────────────────────────────────────────

function generateIndustryFile(inp: IndustryInput): string {
  const constName = `${inp.key}_INDUSTRY`
  const cats = inp.defaultCategories
    .map((c, i) => `      { key: "CAT_${i + 1}", label: "${c}", defaultUnit: "cái" },`)
    .join("\n")
  const occs = inp.occasions
    .map((o, i) => `      { key: "OCC_${i + 1}", label: "${o}", suggestedPromotion: "Ưu đãi đặc biệt" },`)
    .join("\n")
  const sampleNames = inp.sampleProductNames.map((n) => `      "${n}",`).join("\n")

  return `import type { IndustryPluginContract } from "../industry-plugin-contract"

export const ${constName}: IndustryPluginContract = {
  identity: {
    key: "${inp.key}",
    name: "${inp.name}",
    description: "${inp.description}",
    iconName: "${inp.iconName}",
  },
  terminology: {
    makerTitle: "${inp.makerTitle}",
    makerAction: "${inp.makerAction}",
    productRecipe: "Công thức ${inp.rawMaterialItem}",
    sampleProduct: "${inp.sampleProduct}",
    rawMaterialItem: "${inp.rawMaterialItem}",
    completedProductPhoto: "Ảnh ${inp.sampleProduct} hoàn thiện",
    printablesTitle: "Phiếu giao hàng",
    catalogTitle: "${inp.catalogTitle}",
    createButtonLabel: "${inp.createButtonLabel}",
    scanButtonLabel: "${inp.scanButtonLabel}",
    defaultMeasurementUnits: ["cái", "hộp", "bộ", "gói", "kg", "lít"],
    defaultComponentRoles: [
      { key: "PRIMARY", label: "Thành phần chính", isRequired: true },
      { key: "SECONDARY", label: "Thành phần phụ", isRequired: false },
      { key: "ACCESSORY", label: "Phụ kiện / Bao bì", isRequired: false },
    ],
  },
  taxonomy: {
    defaultCategories: [
${cats}
    ],
    occasions: [
${occs}
    ],
    priceRanges: [
      { label: "Dưới 200.000 ₫", min: 0, max: 200000 },
      { label: "200.000 – 500.000 ₫", min: 200000, max: 500000 },
      { label: "500.000 – 1.000.000 ₫", min: 500000, max: 1000000 },
      { label: "Trên 1.000.000 ₫", min: 1000000 },
    ],
  },
  bomSpec: {
    measurementUnits: ["cái", "hộp", "bộ", "gói", "kg", "lít"],
    componentRoles: [
      { key: "PRIMARY", label: "Thành phần chính", isRequired: true },
      { key: "SECONDARY", label: "Thành phần phụ", isRequired: false },
      { key: "ACCESSORY", label: "Phụ kiện / Bao bì", isRequired: false },
    ],
  },
  templates: {
    printables: [
      {
        type: "TAG",
        title: "Thẻ sản phẩm",
        description: "Thẻ đính kèm ${inp.sampleProduct} với thông tin cửa hàng",
        defaultFrontTitle: "${inp.name}",
        defaultBackInstructions: [
          "Cảm ơn bạn đã tin dùng sản phẩm của chúng tôi",
          "Liên hệ để được hỗ trợ và đổi trả trong 7 ngày",
        ],
      },
    ],
  },
  aiConfig: {
    visionFocus: "Nhận diện chất lượng sản phẩm, màu sắc, độ hoàn thiện và tình trạng bao bì",
    studioBackgroundStyles: ["Nền trắng studio chuẩn TMĐT", "Không gian cửa hàng hiện đại", "Ánh sáng tự nhiên"],
    marketingToneExamples: [
      "${inp.marketingTone}",
    ],
    sampleProductNames: [
${sampleNames}
    ],
  },
  navigation: {
    hiddenNavKeys: [],
  },
  // Phí trả cho bên làm thay (chi nhánh/đối tác). Ngành không thuê ngoài sản xuất → \`craftFee: null\`.
  craftFee: {
    feeLabel: "Phí gia công",
    defaultPercent: 50,
    minVnd: 100_000,
    maxVnd: 2_000_000,
    partnerPercent: 75,
    complexityLabels: { EASY: "Đơn giản", MEDIUM: "Trung bình", HARD: "Phức tạp" },
    laborByComplexityVnd: { EASY: 50_000, MEDIUM: 150_000, HARD: 300_000 },
    peakDays: [],
  },
}
`
}

// ─────────────────────────────────────────────
// STEP 3: Cập nhật index.ts
// ─────────────────────────────────────────────

function updateIndustryIndex(inp: IndustryInput, fileName: string): void {
  let content = readFileSync(INDUSTRY_INDEX_PATH, "utf-8")
  const constName = `${inp.key}_INDUSTRY`

  // Thêm import
  if (!content.includes(`from "./${fileName}"`)) {
    content = content.replace(
      /^(import type \{ IndustryPluginContract \}.*\n)/m,
      `$1import { ${constName} } from "./${fileName}"\n`
    )
  }

  // Thêm vào INDUSTRY_REGISTRY
  if (!content.includes(`${inp.key}:`)) {
    content = content.replace(
      /^(\s*)(SERVICES: SERVICES_INDUSTRY,?\s*\n)(\s*\})/m,
      `$1$2$1${inp.key}: ${constName},\n$3`
    )
    // Fallback nếu SERVICES không phải dòng cuối
    if (!content.includes(`${inp.key}:`)) {
      content = content.replace(
        /(\s*\})\s*\n\nexport \{/,
        `  ${inp.key}: ${constName},\n$1\n\nexport {`
      )
    }
  }

  // Thêm vào export
  if (!content.includes(constName + ",\n}")) {
    content = content.replace(
      /^(export \{[^}]+)\}/ms,
      `$1  ${constName},\n}`
    )
  }

  writeFileSync(INDUSTRY_INDEX_PATH, content, "utf-8")
}

// ─────────────────────────────────────────────
// STEP 4: Cập nhật industry-profile.ts (IndustryKey)
// ─────────────────────────────────────────────

function updateIndustryProfile(inp: IndustryInput): void {
  let content = readFileSync(INDUSTRY_PROFILE_PATH, "utf-8")

  // Thêm key vào IndustryKey union type
  if (!content.includes(`"${inp.key}"`)) {
    // Pattern: type IndustryKey = "FLORAL" | "FASHION" | ...
    content = content.replace(
      /(\btype IndustryKey\s*=\s*[^;]+?)(\s*;)/m,
      `$1 | "${inp.key}"$2`
    )
  }

  writeFileSync(INDUSTRY_PROFILE_PATH, content, "utf-8")
}

// ─────────────────────────────────────────────
// STEP 5: Chạy validation suite
// ─────────────────────────────────────────────

function runCmd(cmd: string, label: string): boolean {
  console.log(`\n  ⏳ ${label}...`)
  try {
    execSync(cmd, { cwd: REPO_ROOT, stdio: "pipe" })
    console.log(`  ✅ ${label} — PASS`)
    return true
  } catch (err) {
    const e = err as { stdout?: Buffer; stderr?: Buffer }
    console.error(`  ❌ ${label} — FAIL`)
    if (e.stdout) console.error(e.stdout.toString().slice(0, 800))
    if (e.stderr) console.error(e.stderr.toString().slice(0, 400))
    return false
  }
}

async function runValidationSuite(inp: IndustryInput): Promise<boolean> {
  console.log("\n═══════════════════════════════════════════")
  console.log("  🔍 BƯỚC 3: Chạy Validation Suite tự động")
  console.log("═══════════════════════════════════════════\n")

  const results: { label: string; pass: boolean }[] = []

  // 3a. TypeScript check
  results.push({
    label: "TypeScript typecheck",
    pass: runCmd("npx tsc --noEmit", "TypeScript typecheck"),
  })

  // 3b. Industry contract test
  results.push({
    label: "Industry Plugin Contract test",
    pass: runCmd(
      "npx vitest run src/modules/organization/domain/industry-plugin-contract.test.ts --reporter=verbose",
      "Industry Plugin Contract test"
    ),
  })

  // 3c. UX lint ratchet
  results.push({
    label: "UX Lint ratchet",
    pass: runCmd("npx tsx scripts/ux-lint.ts --check", "UX Lint ratchet"),
  })

  // 3d. Industry term audit — chỉ báo cáo, không fail (vì codebase cũ vẫn còn vi phạm)
  console.log("\n  ⏳ Industry Term Audit (báo cáo vi phạm theo ngành mới)...")
  try {
    const auditOut = execSync(
      `npx tsx scripts/industry-term-audit.ts --check`,
      { cwd: REPO_ROOT, encoding: "utf-8" }
    )
    console.log("  ✅ Industry Term Audit — PASS (không tăng vi phạm)")
    results.push({ label: "Industry Term Audit", pass: true })
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string }
    console.warn("  ⚠️  Industry Term Audit — vi phạm tăng so với baseline")
    console.warn("     Chạy: npm run audit:industry để xem chi tiết và fix")
    results.push({ label: "Industry Term Audit", pass: false })
  }

  // Summary
  console.log("\n─────────────────────────────────────────")
  console.log("  📊 Kết quả Validation Suite:\n")
  let allPass = true
  for (const r of results) {
    const icon = r.pass ? "✅" : "❌"
    console.log(`   ${icon} ${r.label}`)
    if (!r.pass) allPass = false
  }
  console.log()

  return allPass
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  const { dryRun, ...prefill } = parseArgs()

  // Thu thập input
  const inp = await collectIndustryInput(prefill)
  const fileName = inp.key.toLowerCase().replace(/_/g, "-")
  const filePath = join(INDUSTRIES_DIR, `${fileName}.ts`)

  console.log("\n═══════════════════════════════════════════")
  console.log(`  🏭 NGÀNH MỚI: ${inp.name} (${inp.key})`)
  console.log("═══════════════════════════════════════════\n")

  // Kiểm tra trùng lặp
  if (existsSync(filePath)) {
    console.error(`  ❌ File đã tồn tại: ${filePath}`)
    console.error(`     Dùng --key=<KEY> khác hoặc xóa file cũ trước.`)
    process.exit(1)
  }

  const industryContent = generateIndustryFile(inp)

  if (dryRun) {
    console.log("  📄 [DRY RUN] File sẽ được tạo tại:", filePath)
    console.log("\n  Nội dung:\n")
    console.log(industryContent)
    console.log("\n  [DRY RUN] Không có thay đổi nào được ghi vào disk.\n")
    return
  }

  // BƯỚC 1: Tạo file ngành
  console.log("  ⏳ Bước 1: Tạo file đặc tả ngành...")
  if (!existsSync(INDUSTRIES_DIR)) mkdirSync(INDUSTRIES_DIR, { recursive: true })
  writeFileSync(filePath, industryContent, "utf-8")
  console.log(`  ✅ Đã tạo: src/modules/organization/domain/industries/${fileName}.ts`)

  // BƯỚC 2: Đăng ký vào Registry
  console.log("\n  ⏳ Bước 2: Đăng ký vào INDUSTRY_REGISTRY...")
  try {
    updateIndustryIndex(inp, fileName)
    updateIndustryProfile(inp)
    console.log("  ✅ Đã cập nhật index.ts và industry-profile.ts")
  } catch (err) {
    console.error("  ❌ Không tự động cập nhật được registry:", (err as Error).message)
    console.error(`     Mở industry-profile.ts và index.ts để thêm tay:\n`)
    console.error(`     // index.ts: thêm import { ${inp.key}_INDUSTRY } from "./${fileName}"`)
    console.error(`     // index.ts: thêm ${inp.key}: ${inp.key}_INDUSTRY vào INDUSTRY_REGISTRY`)
    console.error(`     // industry-profile.ts: thêm "${inp.key}" vào IndustryKey\n`)
  }

  // BƯỚC 3: Validation suite
  const allPass = await runValidationSuite(inp)

  // Kết quả cuối
  console.log("═══════════════════════════════════════════")
  if (allPass) {
    console.log(`\n  🎉 NGÀNH "${inp.name}" ĐÃ SẴN SÀNG!\n`)
    console.log(`  Các bước tiếp theo:`)
    console.log(`   1. Kiểm tra file: src/modules/organization/domain/industries/${fileName}.ts`)
    console.log(`   2. Gán ngành cho tổ chức trong DB: organization.industry = "${inp.key}"`)
    console.log(`   3. Chạy: npm run audit:industry để xem UI nào cần cập nhật terminology`)
    console.log(`   4. Commit: git add . && git commit -m "feat(industry): add ${inp.key} industry plugin"\n`)
  } else {
    console.error(`\n  ⚠️  Ngành được tạo nhưng có validation chưa pass.`)
    console.error(`      File: src/modules/organization/domain/industries/${fileName}.ts`)
    console.error(`      Sửa lỗi rồi chạy lại: npx tsc --noEmit && npm run audit:industry\n`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Lỗi wizard:", err)
  process.exit(1)
})
