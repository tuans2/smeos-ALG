/**
 * industry-term-audit.ts — SSOT Industry Terminology Auditor
 *
 * Quét toàn bộ src/ để phát hiện các thuật ngữ ngành cụ thể (flower, florist...)
 * được hardcode thay vì dùng IndustryPluginContract SSOT (getIndustryTerminology).
 *
 * Cách chạy:
 *   npx tsx scripts/industry-term-audit.ts              # báo cáo đầy đủ
 *   npx tsx scripts/industry-term-audit.ts --check      # ratchet CI (exit 1 nếu tăng)
 *   npx tsx scripts/industry-term-audit.ts --fix-hints  # in gợi ý SSOT token
 *   npx tsx scripts/industry-term-audit.ts --json       # JSON để pipe
 *   npx tsx scripts/industry-term-audit.ts --update-baseline
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { extname, join, relative } from "node:path"

// ─────────────────────────────────────────────
// CRATE 1: Danh sách pattern cần phát hiện
// ─────────────────────────────────────────────

interface AuditPattern {
  /** Mã rule */
  id: string
  /** Mô tả */
  desc: string
  /** Regex khớp chuỗi JSX/string bị hardcode */
  pattern: RegExp
  /** Token SSOT thay thế */
  ssotHint: string
  /** Mức độ: error | warning */
  severity: "error" | "warning"
}

const AUDIT_PATTERNS: AuditPattern[] = [
  // ── Flower / Florist terms ─────────────────────────────
  {
    id: "IT-F01",
    desc: "Hardcode 'bó hoa' — dùng ti.sampleProduct",
    pattern: /["'`>]([^"'`<]*\bbó hoa\b[^"'`<]*)[`'"<]/gi,
    ssotHint: "ti.sampleProduct (vd: 'mẫu thiết kế' với FASHION)",
    severity: "error",
  },
  {
    id: "IT-F02",
    desc: "Hardcode 'mẫu hoa' — dùng ti.sampleProduct",
    pattern: /["'`>]([^"'`<]*\bmẫu hoa\b[^"'`<]*)[`'"<]/gi,
    ssotHint: "ti.sampleProduct",
    severity: "error",
  },
  {
    id: "IT-F03",
    desc: "Hardcode 'loại hoa' — dùng ti.rawMaterialItem",
    pattern: /["'`>]([^"'`<]*\bloại hoa\b[^"'`<]*)[`'"<]/gi,
    ssotHint: "ti.rawMaterialItem",
    severity: "error",
  },
  {
    id: "IT-F04",
    desc: "Hardcode 'cành hoa' — dùng ti.rawMaterialItem",
    pattern: /["'`>]([^"'`<]*\bcành hoa\b[^"'`<]*)[`'"<]/gi,
    ssotHint: "ti.rawMaterialItem",
    severity: "error",
  },
  {
    id: "IT-F05",
    desc: "Hardcode 'cắm hoa' — dùng ti.makerAction",
    pattern: /["'`>]([^"'`<]*\bcắm hoa\b[^"'`<]*)[`'"<]/gi,
    ssotHint: "ti.makerAction (vd: 'may đo' với FASHION)",
    severity: "error",
  },
  {
    id: "IT-F06",
    desc: "Hardcode 'thợ cắm' / 'thợ hoa' — dùng ti.makerTitle",
    pattern: /["'`>]([^"'`<]*\bthợ (?:cắm|hoa)\b[^"'`<]*)[`'"<]/gi,
    ssotHint: "ti.makerTitle (vd: 'nhà thiết kế' với FASHION)",
    severity: "error",
  },
  {
    id: "IT-F07",
    desc: "Hardcode 'tiệm hoa' — dùng tên cửa hàng động",
    pattern: /["'`>]([^"'`<]*\btiệm hoa\b[^"'`<]*)[`'"<]/gi,
    ssotHint: "orgName hoặc ti.sampleProduct",
    severity: "warning",
  },
  {
    id: "IT-F08",
    desc: "Hardcode 'hoa tươi' — dùng ti.sampleProduct",
    pattern: /["'`>]([^"'`<]*\bhoa tươi\b[^"'`<]*)[`'"<]/gi,
    ssotHint: "ti.sampleProduct",
    severity: "warning",
  },
  {
    id: "IT-F09",
    desc: "Hardcode 'Kho mẫu hoa' — dùng ti.catalogTitle",
    pattern: /["'`>]([^"'`<]*\bKho mẫu hoa\b[^"'`<]*)[`'"<]/gi,
    ssotHint: "ti.catalogTitle",
    severity: "error",
  },
  {
    id: "IT-F10",
    desc: "Hardcode 'Tạo mẫu hoa mới' — dùng ti.createButtonLabel",
    pattern: /["'`>]([^"'`<]*\bTạo mẫu hoa\b[^"'`<]*)[`'"<]/gi,
    ssotHint: "ti.createButtonLabel",
    severity: "error",
  },
  {
    id: "IT-F11",
    desc: "Hardcode 'người cắm hoa' / 'thợ cắm hoa' — dùng ti.makerTitle",
    pattern: /["'`>]([^"'`<]*\b(?:người|thợ) cắm hoa\b[^"'`<]*)[`'"<]/gi,
    ssotHint: "ti.makerTitle",
    severity: "error",
  },
  {
    id: "IT-F12",
    desc: "Hardcode 'xưởng cắm' — dùng ti.makerTitle",
    pattern: /["'`>]([^"'`<]*\bxưởng cắm\b[^"'`<]*)[`'"<]/gi,
    ssotHint: "ti.makerTitle",
    severity: "error",
  },
  // ── Structural / Guidance card checks ─────────────────
  {
    id: "IT-G01",
    desc: "Guidance card hardcode 'hoa' trong title/description prop",
    pattern: /(?:title|description)=["']([^"']*\bhoa\b[^"']*)['"]/gi,
    ssotHint: "Dùng template literal với ti.sampleProduct",
    severity: "warning",
  },
]

// ─────────────────────────────────────────────
// CRATE 2: File/pattern whitelist
// ─────────────────────────────────────────────

/** Các file ĐƯỢC PHÉP chứa terms (dữ liệu ngành FLORAL, test data, v.v.) */
const WHITELIST_PATH_PATTERNS: RegExp[] = [
  // Industry plugin files — đây là SSOT định nghĩa terms, không phải hardcode
  /src\/modules\/organization\/domain\/industries\/floral/,
  /src\/modules\/organization\/domain\/industry-plugin-contract/,
  /src\/modules\/organization\/domain\/industry-profile/,
  // Preview data (mock)
  /kho-templates\/preview-data/,
  // Test files
  /\.test\.(ts|tsx)$/,
  /\/__tests__\//,
  // Script chính nó
  /scripts\/industry-term-audit/,
  // Knowledge base data
  /knowledge-base\/knowledge-data/,
  // Greeting card templates — customer-facing floral content bị giới hạn scope
  /greeting-card\/og\//,
  // Vision suggestions (AI model output descriptions)
  /catalog\/vision-suggestions/,
  // Từ vựng riêng ngành hoa có chủ đích (AUD-037, a3a1f0d5): thay bằng token đa ngành làm hỏng
  // từ khoá tra xu hướng, tiêu đề cột Excel cũ của tiệm, từ khoá trợ lý và mẫu đơn trong chat
  /market-intelligence\/domain\/market-taxonomy/,
  /market-intelligence\/opportunity-illustration/,
  /products\/bulk-import\/parse-product-sheet/,
  /chat-assistant\/domain\/chat-order-extractor/,
  /chat-assistant\/domain\/saas-knowledge-base/,
  // Bộ cấu hình dành riêng chuỗi hoa
  /chain-os\/presets\/florist-chain-bundle/,
]

/** Các pattern trong code được coi là safe (comments, tên biến nội bộ, v.v.) */
const WHITELIST_INLINE_PATTERNS: RegExp[] = [
  // Comment lines
  /^\s*\/\//,
  /^\s*\*/,
  // Import statements
  /^import\s/,
  // Type definitions
  /type\s+\w+\s*=/,
  // Tên field interface/type (không phải string UI)
  /flowerName|flowerMatch|FlowerBomItem|FoliageBomItem/,
  // alt text cho ảnh kỹ thuật (không phải UI label)
  /alt=\{`Mẫu \$\{ti\./,
]

// ─────────────────────────────────────────────
// CRATE 3: Scanner logic
// ─────────────────────────────────────────────

interface Finding {
  file: string
  line: number
  col: number
  ruleId: string
  desc: string
  snippet: string
  ssotHint: string
  severity: "error" | "warning"
}

const REPO_ROOT = join(__dirname, "..")
const BASELINE_PATH = join(REPO_ROOT, "scripts/industry-term-audit-baseline.json")

function shouldSkipFile(filePath: string): boolean {
  const rel = relative(REPO_ROOT, filePath).replace(/\\/g, "/")
  return WHITELIST_PATH_PATTERNS.some((p) => p.test(rel))
}

function shouldSkipLine(line: string): boolean {
  return WHITELIST_INLINE_PATTERNS.some((p) => p.test(line))
}

function scanFile(filePath: string): Finding[] {
  const findings: Finding[] = []
  if (shouldSkipFile(filePath)) return findings

  const content = readFileSync(filePath, "utf-8")
  const lines = content.split("\n")

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]
    if (!line || shouldSkipLine(line)) continue

    for (const rule of AUDIT_PATTERNS) {
      // Reset lastIndex để tránh bug với global regex
      rule.pattern.lastIndex = 0

      let match: RegExpExecArray | null
      while ((match = rule.pattern.exec(line)) !== null) {
        // Bỏ qua nếu nằm trong comment JSX {/* ... */}
        const beforeMatch = line.slice(0, match.index)
        if (beforeMatch.includes("{/*") && !beforeMatch.includes("*/")) continue

        findings.push({
          file: relative(REPO_ROOT, filePath).replace(/\\/g, "/"),
          line: lineIdx + 1,
          col: match.index + 1,
          ruleId: rule.id,
          desc: rule.desc,
          snippet: line.trim().slice(0, 120),
          ssotHint: rule.ssotHint,
          severity: rule.severity,
        })
      }
      rule.pattern.lastIndex = 0
    }
  }

  return findings
}

function collectFiles(dir: string): string[] {
  const files: string[] = []
  if (!existsSync(dir)) return files

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (entry.startsWith(".") || entry === "node_modules") continue

    const stat = statSync(full)
    if (stat.isDirectory()) {
      files.push(...collectFiles(full))
    } else {
      const ext = extname(entry)
      if (ext === ".tsx" || ext === ".ts") {
        files.push(full)
      }
    }
  }
  return files
}

function runAudit(): Finding[] {
  const srcDir = join(REPO_ROOT, "src")
  const allFiles = collectFiles(srcDir)

  const allFindings: Finding[] = []
  for (const file of allFiles) {
    allFindings.push(...scanFile(file))
  }

  // Sort: errors first, then by file+line
  return allFindings.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1
    if (a.file !== b.file) return a.file.localeCompare(b.file)
    return a.line - b.line
  })
}

// ─────────────────────────────────────────────
// CRATE 4: Reporter
// ─────────────────────────────────────────────

function printReport(findings: Finding[], showHints: boolean) {
  const errors = findings.filter((f) => f.severity === "error")
  const warnings = findings.filter((f) => f.severity === "warning")

  console.log("\n══════════════ INDUSTRY TERM AUDIT ══════════════")
  console.log(`Tổng: ${findings.length} phát hiện  |  ❌ ${errors.length} lỗi  |  ⚠️  ${warnings.length} cảnh báo`)
  console.log("═════════════════════════════════════════════════\n")

  if (findings.length === 0) {
    console.log("✅ Không có hardcoded industry term nào. SSOT 100%!")
    return
  }

  // Group by file
  const byFile = new Map<string, Finding[]>()
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, [])
    byFile.get(f.file)!.push(f)
  }

  for (const [file, filefindings] of byFile) {
    console.log(`\n📄 ${file}  (${filefindings.length} vi phạm)`)
    console.log("─".repeat(80))

    for (const f of filefindings) {
      const icon = f.severity === "error" ? "❌" : "⚠️ "
      console.log(`  ${icon} [${f.ruleId}] L${f.line}:${f.col}  ${f.desc}`)
      console.log(`     Đoạn code: ${f.snippet}`)
      if (showHints) {
        console.log(`     💡 Fix gợi ý: ${f.ssotHint}`)
      }
    }
  }

  console.log("\n═════════════════════════════════════════════════")

  // Rule summary
  const ruleCount = new Map<string, number>()
  for (const f of findings) {
    ruleCount.set(f.ruleId, (ruleCount.get(f.ruleId) || 0) + 1)
  }

  console.log("\n📊 Vi phạm theo rule:")
  const sorted = [...ruleCount.entries()].sort((a, b) => b[1] - a[1])
  for (const [ruleId, count] of sorted) {
    const rule = AUDIT_PATTERNS.find((r) => r.id === ruleId)
    console.log(`   ${ruleId.padEnd(8)} ${String(count).padStart(4)}   ${rule?.desc ?? ""}`)
  }
  console.log()
}

// ─────────────────────────────────────────────
// CRATE 5: Main
// ─────────────────────────────────────────────

interface BaselineData {
  total: number
  errorCount: number
  byRule: Record<string, number>
  updatedAt: string
}

function main() {
  const args = process.argv.slice(2)
  const isCheck = args.includes("--check")
  const isJson = args.includes("--json")
  const isUpdateBaseline = args.includes("--update-baseline")
  const showHints = args.includes("--fix-hints") || (!isCheck && !isJson && !isUpdateBaseline)

  const findings = runAudit()

  if (isJson) {
    console.log(JSON.stringify(findings, null, 2))
    process.exit(findings.filter((f) => f.severity === "error").length > 0 ? 1 : 0)
    return
  }

  printReport(findings, showHints)

  const errors = findings.filter((f) => f.severity === "error")
  const byRule: Record<string, number> = {}
  for (const f of findings) {
    byRule[f.ruleId] = (byRule[f.ruleId] || 0) + 1
  }

  if (isUpdateBaseline) {
    const baseline: BaselineData = {
      total: findings.length,
      errorCount: errors.length,
      byRule,
      updatedAt: new Date().toISOString(),
    }
    writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2), "utf-8")
    console.log(`✅ Đã lưu baseline: ${findings.length} phát hiện (${errors.length} lỗi) → ${BASELINE_PATH}`)
    return
  }

  if (isCheck) {
    if (!existsSync(BASELINE_PATH)) {
      console.error(`\n❌ Chưa có baseline. Chạy --update-baseline trước.\n`)
      process.exit(1)
    }

    const baseline: BaselineData = JSON.parse(readFileSync(BASELINE_PATH, "utf-8"))
    let hasRegression = false
    const regressions: string[] = []

    // Kiểm tra từng rule riêng để tránh false positive khi fix 1 rule nhưng thêm 1 rule khác
    for (const [ruleId, count] of Object.entries(byRule)) {
      const baseCount = baseline.byRule[ruleId] || 0
      if (count > baseCount) {
        hasRegression = true
        regressions.push(`  ${ruleId}: ${baseCount} → ${count} (+${count - baseCount})`)
      }
    }

    if (hasRegression) {
      console.error("\n❌ REGRESSION: Số lượng hardcoded terms tăng so với baseline:")
      for (const r of regressions) console.error(r)
      console.error("\n→ Sửa các vi phạm trên hoặc dùng getIndustryTerminology() từ SSOT.\n")
      process.exit(1)
    }

    const reduced = baseline.total - findings.length
    if (reduced > 0) {
      console.log(`\n✅ RATCHET ĐẠT: Giảm ${reduced} vi phạm (${baseline.total} → ${findings.length}). Chạy --update-baseline để cập nhật.\n`)
    } else {
      console.log(`\n✅ RATCHET ĐẠT: Không có vi phạm nào tăng (baseline: ${baseline.total}, hiện tại: ${findings.length}).\n`)
    }
    return
  }

  // Non-check mode: exit 1 nếu có lỗi
  if (errors.length > 0) {
    console.error(`\n→ Có ${errors.length} lỗi cần sửa. Dùng --fix-hints để xem gợi ý SSOT token.\n`)
    process.exit(1)
  }
}

main()
