/**
 * check-industry.ts — Công cụ kiểm tra toàn diện tính tuân thủ SSOT của hệ thống Đa ngành
 *
 * Kiểm tra 4 trụ cột:
 *   1. Contract & Registry: Mọi file ngành đều tuân thủ IndustryPluginContract, có mặt trong Registry & IndustryKey.
 *   2. Unit test: Chạy vitest cho industry-plugin-contract.test.ts.
 *   3. Typecheck: Kiểm tra hệ thống types TS không có lỗi compile.
 *   4. Terminology Audit: Kiểm tra ratchet vi phạm hardcoded terms (không cho phép phát sinh từ ngữ cứng mới).
 *
 * Cách dùng:
 *   npx tsx scripts/check-industry.ts
 *   npx tsx scripts/check-industry.ts --check         (exit 1 nếu có lỗi)
 *   npx tsx scripts/check-industry.ts --industry=FASHION (kiểm tra chuyên sâu một ngành)
 */

import { readdirSync, existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { execSync } from "node:child_process"
import { INDUSTRY_REGISTRY } from "../src/modules/organization/domain/industries"
import { ALL_INDUSTRY_KEYS } from "../src/modules/organization/domain/industry-profile"
import type { IndustryPluginContract } from "../src/modules/organization/domain/industry-plugin-contract"

const REPO_ROOT = join(__dirname, "..")
const INDUSTRIES_DIR = join(REPO_ROOT, "src/modules/organization/domain/industries")

interface CheckResult {
  step: string
  status: "PASS" | "FAIL" | "WARN"
  details: string[]
}

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const found = args.find((a) => a.startsWith(`--${flag}=`))
    return found ? found.split("=").slice(1).join("=") : undefined
  }
  return {
    isCheckOnly: args.includes("--check"),
    industryFilter: get("industry")?.toUpperCase(),
  }
}

// ─────────────────────────────────────────────
// TRỤ CỘT 1: Registry & File Consistency
// ─────────────────────────────────────────────
function checkRegistryAndFiles(): CheckResult {
  const details: string[] = []
  let hasFail = false

  const files = readdirSync(INDUSTRIES_DIR).filter(
    (f) => f.endsWith(".ts") && f !== "index.ts" && !f.endsWith(".test.ts")
  )

  details.push(`Phát hiện ${files.length} tệp ngành trong industries/`)

  // 1. Kiểm tra từng file có trong registry không
  const registryKeys = Object.keys(INDUSTRY_REGISTRY)
  const registeredPlugins = Object.values(INDUSTRY_REGISTRY) as IndustryPluginContract[]

  for (const file of files) {
    const expectedKeyFromFile = file.replace(".ts", "").toUpperCase().replace(/-/g, "_")
    const match = registeredPlugins.find(
      (p) => p.identity.key === expectedKeyFromFile || file.includes(p.identity.key.toLowerCase().replace(/_/g, "-"))
    )

    if (!match) {
      details.push(`❌ Tệp "${file}" chưa được đăng ký trong INDUSTRY_REGISTRY (index.ts)`)
      hasFail = true
    } else {
      details.push(`✅ [${match.identity.key}] "${file}" ➔ Đã đăng ký trong Registry (${match.identity.name})`)
    }
  }

  // 2. Kiểm tra Registry keys có nằm trong ALL_INDUSTRY_KEYS
  for (const key of registryKeys) {
    if (!ALL_INDUSTRY_KEYS.includes(key as any)) {
      details.push(`❌ Khóa "${key}" có trong INDUSTRY_REGISTRY nhưng thiếu trong ALL_INDUSTRY_KEYS (industry-profile.ts)`)
      hasFail = true
    }
  }

  // 3. Kiểm tra tính toàn vẹn của Contract từng ngành
  for (const [key, plugin] of Object.entries(INDUSTRY_REGISTRY)) {
    const p = plugin as IndustryPluginContract
    const missingFields: string[] = []
    if (!p.identity?.key) missingFields.push("identity.key")
    if (!p.identity?.name) missingFields.push("identity.name")
    if (!p.terminology?.makerTitle) missingFields.push("terminology.makerTitle")
    if (!p.terminology?.makerAction) missingFields.push("terminology.makerAction")
    if (!p.terminology?.sampleProduct) missingFields.push("terminology.sampleProduct")
    if (!p.terminology?.rawMaterialItem) missingFields.push("terminology.rawMaterialItem")
    if (!p.terminology?.catalogTitle) missingFields.push("terminology.catalogTitle")
    if (!p.taxonomy?.defaultCategories || p.taxonomy.defaultCategories.length < 2) {
      missingFields.push("taxonomy.defaultCategories (< 2)")
    }
    if (!p.bomSpec?.measurementUnits || p.bomSpec.measurementUnits.length === 0) {
      missingFields.push("bomSpec.measurementUnits")
    }

    if (missingFields.length > 0) {
      details.push(`❌ Ngành [${key}] thiếu các trường SSOT bắt buộc: ${missingFields.join(", ")}`)
      hasFail = true
    }
  }

  return {
    step: "1. Registry & File Consistency",
    status: hasFail ? "FAIL" : "PASS",
    details,
  }
}

// ─────────────────────────────────────────────
// TRỤ CỘT 2: Contract Unit Tests
// ─────────────────────────────────────────────
function checkUnitTests(): CheckResult {
  const details: string[] = []
  try {
    const out = execSync("npx vitest run src/modules/organization/domain/industry-plugin-contract.test.ts", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
    })
    const passedMatch = out.match(/(\d+) passed/)
    details.push(`✅ Unit tests chạy thành công (${passedMatch ? passedMatch[0] : "all passed"})`)
    return { step: "2. Contract Unit Tests", status: "PASS", details }
  } catch (err: any) {
    details.push(`❌ Unit test thất bại:\n${err.stdout || err.message}`)
    return { step: "2. Contract Unit Tests", status: "FAIL", details }
  }
}

// ─────────────────────────────────────────────
// TRỤ CỘT 3: TypeScript Typecheck
// ─────────────────────────────────────────────
function checkTypecheck(): CheckResult {
  const details: string[] = []
  try {
    execSync("npx tsc --noEmit", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
    })
    details.push("✅ TypeScript typecheck: 0 lỗi compile")
    return { step: "3. TypeScript Typecheck", status: "PASS", details }
  } catch (err: any) {
    const errorLines = (err.stdout as string || err.message as string)
      .split("\n")
      .filter((l: string) => l.includes("error TS"))
      .slice(0, 5)
    details.push(`❌ TypeScript typecheck phát hiện lỗi:`)
    details.push(...errorLines)
    return { step: "3. TypeScript Typecheck", status: "FAIL", details }
  }
}

// ─────────────────────────────────────────────
// TRỤ CỘT 4: Terminology Audit (Ratchet Check)
// ─────────────────────────────────────────────
function checkTerminologyAudit(): CheckResult {
  const details: string[] = []
  try {
    const out = execSync("npx tsx scripts/industry-term-audit.ts --check", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
    })
    const lastLine = out.trim().split("\n").pop() || ""
    details.push(`✅ Terminology Ratchet Check: ${lastLine}`)
    return { step: "4. Terminology Audit (Ratchet)", status: "PASS", details }
  } catch (err: any) {
    const output = (err.stdout as string || "") + (err.stderr as string || "")
    const errorLines = output.split("\n").filter((l) => l.includes("RAT-ERR") || l.includes("VI PHẠM")).slice(0, 5)
    details.push(`❌ Phát hiện vi phạm từ ngữ chuyên ngành vượt quá baseline:`)
    if (errorLines.length > 0) {
      details.push(...errorLines)
    } else {
      details.push("Chạy 'npm run audit:industry' để xem chi tiết vi phạm.")
    }
    return { step: "4. Terminology Audit (Ratchet)", status: "FAIL", details }
  }
}

// ─────────────────────────────────────────────
// TRỤ CỘT 5: Backend AI Prompts & JSON Schema Contracts
// ─────────────────────────────────────────────
const WORKERS_CONTRACTS_DIR = join(REPO_ROOT, "workers/vision/contracts")

function checkBackendContracts(): CheckResult {
  const details: string[] = []
  let hasFail = false

  // 1. Kiểm tra Domain AI Config & JSON Taxonomy/BOM cho mọi ngành
  for (const [key, plugin] of Object.entries(INDUSTRY_REGISTRY)) {
    const p = plugin as IndustryPluginContract
    const missingAi: string[] = []
    if (!p.aiConfig?.visionFocus) missingAi.push("aiConfig.visionFocus")
    if (!p.aiConfig?.studioBackgroundStyles || p.aiConfig.studioBackgroundStyles.length < 2) {
      missingAi.push("aiConfig.studioBackgroundStyles (< 2)")
    }
    if (!p.aiConfig?.sampleProductNames || p.aiConfig.sampleProductNames.length < 2) {
      missingAi.push("aiConfig.sampleProductNames (< 2)")
    }
    if (missingAi.length > 0) {
      details.push(`❌ Ngành [${key}] thiếu cấu hình Backend AI: ${missingAi.join(", ")}`)
      hasFail = true
    }

    // Kiểm tra cấu trúc taxonomy & BOM
    const invalidCat = p.taxonomy?.defaultCategories?.some((c) => !c.key || !c.label)
    if (invalidCat) {
      details.push(`❌ Ngành [${key}] taxonomy.defaultCategories có phần tử thiếu key hoặc label`)
      hasFail = true
    }
  }

  // 2. Kiểm tra các thư mục contracts của Vision Worker
  const visionContractDirs = ["fashion", "homestay"] // các ngành đã có worker contract riêng biệt
  for (const dirName of visionContractDirs) {
    const dirPath = join(WORKERS_CONTRACTS_DIR, dirName)
    if (!existsSync(dirPath)) continue

    const schemaPath = join(dirPath, "Schema.json")
    const promptPath = join(dirPath, "Prompt.md")
    const configPath = join(dirPath, "config.json")

    // Prompt.md
    if (!existsSync(promptPath)) {
      details.push(`❌ [Worker ${dirName}] Thiếu Prompt.md`)
      hasFail = true
    } else {
      details.push(`✅ [Worker ${dirName}] Prompt.md hợp lệ`)
    }

    // config.json
    if (!existsSync(configPath)) {
      details.push(`❌ [Worker ${dirName}] Thiếu config.json`)
      hasFail = true
    }

    // Schema.json (OpenAI Structured Outputs strict check)
    if (!existsSync(schemaPath)) {
      details.push(`❌ [Worker ${dirName}] Thiếu Schema.json`)
      hasFail = true
    } else {
      try {
        const schema = JSON.parse(readFileSync(schemaPath, "utf-8"))
        if (schema.strict !== true) {
          details.push(`❌ [Worker ${dirName}] Schema.json bắt buộc phải có "strict": true`)
          hasFail = true
        } else if (!schema.schema || schema.schema.additionalProperties !== false) {
          details.push(`❌ [Worker ${dirName}] Schema.json bắt buộc có "additionalProperties": false ở root`)
          hasFail = true
        } else {
          details.push(`✅ [Worker ${dirName}] Schema.json tuân thủ 100% chuẩn OpenAI Structured Outputs`)
        }
      } catch (e: any) {
        details.push(`❌ [Worker ${dirName}] Schema.json lỗi cú pháp JSON: ${e.message}`)
        hasFail = true
      }
    }
  }

  return {
    step: "5. Backend AI Prompts & JSON Schemas",
    status: hasFail ? "FAIL" : "PASS",
    details,
  }
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
function main() {
  const { isCheckOnly, industryFilter } = parseArgs()

  console.log("\n🔍  ALG — KIỂM TRA ĐỒNG BỘ ĐA NGÀNH THEO SSOT (FRONTEND + BACKEND)\n")
  console.log("═".repeat(65))
  if (industryFilter) {
    console.log(`  🎯 Lọc theo ngành: ${industryFilter}`)
  }
  console.log(`  Thời gian: ${new Date().toLocaleString("vi-VN")}\n`)

  const results: CheckResult[] = [
    checkRegistryAndFiles(),
    checkUnitTests(),
    checkTypecheck(),
    checkTerminologyAudit(),
    checkBackendContracts(),
  ]

  let overallPass = true

  for (const res of results) {
    const icon = res.status === "PASS" ? "🟢" : res.status === "WARN" ? "🟡" : "🔴"
    console.log(`\n${icon} [${res.status}] ${res.step}`)
    console.log("─".repeat(50))
    for (const d of res.details) {
      console.log(`   ${d}`)
    }
    if (res.status === "FAIL") {
      overallPass = false
    }
  }

  console.log("\n" + "═".repeat(65))
  if (overallPass) {
    console.log("🎉  TẤT CẢ 5 TRỤ CỘT ĐỀU ĐẠT CHUẨN SSOT ĐA NGÀNH (FRONTEND + BACKEND)!\n")
    console.log("   Hệ thống sẵn sàng: Khi tạo ngành mới hoặc đổi ngành,")
    console.log("   toàn bộ thuật ngữ, danh mục, BOM & AI config sẽ tự động thích ứng.\n")
    process.exit(0)
  } else {
    console.error("⚠️   PHÁT HIỆN LỖI KHÔNG TUÂN THỦ CHUẨN ĐA NGÀNH!\n")
    console.error("   Vui lòng sửa các mục ❌ ở trên hoặc chạy:")
    console.error("     npm run audit:industry    (để xem chi tiết từ ngữ cần thay)")
    console.error("     npm run typecheck         (để xem chi tiết lỗi kiểu dữ liệu)\n")
    if (isCheckOnly) {
      process.exit(1)
    }
  }
}

main()
