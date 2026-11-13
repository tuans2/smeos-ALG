/**
 * UX Lint CLI v0
 *
 * Kiểm tra các luật chất lượng giao diện (R1–R11) theo đặc tả 03a UX Constitution
 * và KE_HOACH_NANG_CAP_UIUX.md (Phụ lục B).
 *
 * Cách chạy:
 *   npx tsx scripts/ux-lint.ts                 # in bảng tổng hợp
 *   npx tsx scripts/ux-lint.ts --json          # in JSON chi tiết
 *   npx tsx scripts/ux-lint.ts --check         # so sánh ratchet với baseline
 *   npx tsx scripts/ux-lint.ts --update-baseline # cập nhật baseline
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { extname, join, relative } from "node:path"
import ts from "typescript"
import { ALL_RULES, type Violation } from "./ux-lint/rules"
import { PD_RULES } from "./ux-lint/rules-pd"
import { ENTERPRISE_RULES } from "./ux-lint/rules-enterprise"
import { TOKEN_RULES } from "./ux-lint/rules-tokens"
import {
  type AllowlistConfig,
  type BaselineData,
  buildMatrix,
  isAllowlisted,
  printSummaryTable,
} from "./ux-lint/report"

const REPO_ROOT = join(__dirname, "..")
const ALLOWLIST_PATH = join(REPO_ROOT, "scripts/ux-lint-allow.json")
const BASELINE_PATH = join(REPO_ROOT, "scripts/ux-lint-baseline.json")

const TARGET_DIRS = [join(REPO_ROOT, "src/app"), join(REPO_ROOT, "src/components")]

function findTsxFiles(dir: string): string[] {
  const files: string[] = []
  if (!existsSync(dir)) return files

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = relative(REPO_ROOT, full).replace(/\\/g, "/")

    // Exclusions
    if (
      rel.includes("src/generated") ||
      rel.includes(".test.tsx") ||
      rel.includes("preview-data") ||
      rel.includes("node_modules")
    ) {
      continue
    }

    const stat = statSync(full)
    if (stat.isDirectory()) {
      files.push(...findTsxFiles(full))
    } else if (extname(entry) === ".tsx") {
      files.push(full)
    }
  }
  return files
}

function loadAllowlist(): AllowlistConfig {
  if (existsSync(ALLOWLIST_PATH)) {
    try {
      return JSON.parse(readFileSync(ALLOWLIST_PATH, "utf-8"))
    } catch {
      return { entries: [] }
    }
  }
  return { entries: [] }
}

function runLint(): Violation[] {
  const allowlist = loadAllowlist()
  const allViolations: Violation[] = []

  const targetFiles: string[] = []
  for (const dir of TARGET_DIRS) {
    targetFiles.push(...findTsxFiles(dir))
  }

  for (const file of targetFiles) {
    const code = readFileSync(file, "utf-8")
    const relPath = relative(REPO_ROOT, file).replace(/\\/g, "/")
    const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)

    const context = {
      filePath: file,
      relativeFilePath: relPath,
      sourceCode: code,
    }

    for (const [ruleId, ruleFn] of Object.entries({ ...ALL_RULES, ...PD_RULES, ...ENTERPRISE_RULES, ...TOKEN_RULES })) {
      try {
        const violations = ruleFn(sourceFile, context)
        for (const v of violations) {
          if (!isAllowlisted(v, allowlist)) {
            allViolations.push(v)
          }
        }
      } catch (err) {
        console.error(`Lỗi khi chạy rule ${ruleId} trên ${relPath}:`, err)
      }
    }
  }

  return allViolations
}

function main() {
  const args = process.argv.slice(2)
  const isJson = args.includes("--json")
  const isCheck = args.includes("--check")
  const isUpdateBaseline = args.includes("--update-baseline")

  const violations = runLint()

  if (isJson) {
    console.log(JSON.stringify(violations, null, 2))
    return
  }

  printSummaryTable(violations)

  const currentMatrix = buildMatrix(violations)

  if (isUpdateBaseline) {
    const baselineData: BaselineData = {
      summary: currentMatrix,
      total: violations.length,
      updatedAt: new Date().toISOString(),
    }
    writeFileSync(BASELINE_PATH, JSON.stringify(baselineData, null, 2), "utf-8")
    console.log(`✓ Đã cập nhật baseline (${violations.length} vi phạm) tại ${BASELINE_PATH}`)
    return
  }

  if (isCheck) {
    if (!existsSync(BASELINE_PATH)) {
      console.error(`✗ Chưa có file baseline tại ${BASELINE_PATH}. Chạy --update-baseline trước.`)
      process.exit(1)
    }

    const baselineData: BaselineData = JSON.parse(readFileSync(BASELINE_PATH, "utf-8"))
    const baseSummary = baselineData.summary

    let hasRegressions = false
    const increases: string[] = []

    for (const [bucket, rules] of Object.entries(currentMatrix)) {
      for (const [rule, count] of Object.entries(rules)) {
        const baseCount = baseSummary[bucket]?.[rule] || 0
        if (count > baseCount) {
          hasRegressions = true
          increases.push(`  - ${bucket} [${rule}]: ${baseCount} -> ${count} (+${count - baseCount})`)
        }
      }
    }

    if (hasRegressions) {
      console.error("\n❌ PHÁT HIỆN TĂNG VI PHẠM UX LINT SO VỚI BASELINE (RATCHET REGRESSION):")
      for (const inc of increases) {
        console.error(inc)
      }
      console.error("\nVui lòng sửa các vi phạm trên trước khi tiếp tục.\n")
      process.exit(1)
    }

    if (violations.length < baselineData.total) {
      console.log(
        `✓ Ratchet check ĐẠT: Tổng vi phạm đã giảm từ ${baselineData.total} xuống ${violations.length}. Hãy chạy --update-baseline.`
      )
    } else {
      console.log(`✓ Ratchet check ĐẠT: Không có vi phạm nào tăng so với baseline (${violations.length} vi phạm).`)
    }
  }
}

main()
