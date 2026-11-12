#!/usr/bin/env tsx
/**
 * apply-copywrite-style.ts
 *
 * Script áp dụng nhanh phong cách văn phong (Copywriting Style) cho toàn bộ hệ thống ALG.
 * Cách dùng:
 *   npx tsx scripts/apply-copywrite-style.ts --style=minimal
 *   npx tsx scripts/apply-copywrite-style.ts --style=pro-saas
 *   npx tsx scripts/apply-copywrite-style.ts --style=friendly
 *   npx tsx scripts/apply-copywrite-style.ts --list
 */

import fs from "fs"
import path from "path"
import { STYLES_CATALOG, type CopywritingStyleKey } from "../src/lib/i18n/styles"
import { viDictionary } from "../src/lib/i18n/locales/vi"

// Hàm đệ quy merge deep
type Dict = Record<string, unknown>
const isDict = (v: unknown): v is Dict => !!v && typeof v === "object" && !Array.isArray(v)

function deepMerge<T extends Dict>(target: T, source: Dict): T {
  const output: Dict = { ...target }
  for (const key of Object.keys(source)) {
    const from = source[key]
    const into = target[key]
    if (isDict(from) && isDict(into)) output[key] = deepMerge(into, from)
    else if (from !== undefined) output[key] = from
  }
  return output as T
}

function printHelp() {
  console.log(`
======================================================
  ALG UI Copywriting Style Engine (SSOT Switcher)
======================================================
Lựa chọn các style có sẵn:
  --style=friendly   Thân thiện, gần gũi, hướng dẫn tận tình
  --style=pro-saas   B2B SaaS chuyên nghiệp, súc tích, chuẩn mực
  --style=minimal    Tối giản, ngắn gọn tối đa cho thao tác nhanh
  --list             Xem danh sách phong cách hiện có
======================================================
`)
}

async function main() {
  const args = process.argv.slice(2)

  if (args.includes("--help") || args.length === 0) {
    printHelp()
    process.exit(0)
  }

  if (args.includes("--list")) {
    console.log("Danh mục phong cách khả dụng:")
    for (const [key, def] of Object.entries(STYLES_CATALOG)) {
      console.log(` • [${key}] ${def.name}: ${def.description}`)
    }
    process.exit(0)
  }

  const styleArg = args.find((a) => a.startsWith("--style="))
  if (!styleArg) {
    console.error("❌ Vui lòng chỉ định style: --style=<friendly|pro-saas|minimal>")
    process.exit(1)
  }

  const styleKey = styleArg.split("=")[1] as CopywritingStyleKey
  const selectedStyle = STYLES_CATALOG[styleKey]

  if (!selectedStyle) {
    console.error(`❌ Style không hợp lệ: "${styleKey}". Hỗ trợ: friendly, pro-saas, minimal`)
    process.exit(1)
  }

  console.log(`🚀 Đang áp dụng phong cách [${selectedStyle.name}] vào hệ thống...`)

  // Áp dụng overrides vào từng namespace tương ứng trong src/lib/i18n/locales/vi/
  const localesDir = path.resolve(process.cwd(), "src/lib/i18n/locales/vi")
  const overrides = selectedStyle.overrides

  for (const [namespace, nsOverrides] of Object.entries(overrides)) {
    const filePath = path.join(localesDir, `${namespace === "greetingCard" ? "greeting-card" : namespace}.ts`)
    const currentModule = (viDictionary as unknown as Record<string, unknown>)[namespace]
    if (!isDict(currentModule)) continue

    const merged = deepMerge(currentModule, nsOverrides as Dict)

    // Tạo code xuất file TypeScript giữ nguyên cấu trúc
    const varName = `${namespace === "greetingCard" ? "greetingCard" : namespace}Vi`
    const fileContent = `/**
 * ${path.basename(filePath)} — Từ điển UI Tiếng Việt [Style: ${selectedStyle.key}]
 * Tự động cập nhật bởi scripts/apply-copywrite-style.ts
 */

export const ${varName} = ${JSON.stringify(merged, null, 2)} as const
`
    // Mở-rồi-ghi trên cùng một file descriptor (không kiểm tồn tại rồi mới ghi — tránh race, CodeQL)
    let fd: number
    try {
      fd = fs.openSync(filePath, "r+")
    } catch {
      continue
    }
    try {
      fs.ftruncateSync(fd, 0)
      fs.writeSync(fd, fileContent, 0, "utf-8")
    } finally {
      fs.closeSync(fd)
    }
    console.log(`  ✓ Đã cập nhật namespace: ${namespace} (${path.basename(filePath)})`)
  }

  console.log(`\n✨ Hoàn tất! Hệ thống đã chuyển đổi toàn bộ câu chữ sang phong cách: "${selectedStyle.name}".`)
}

main().catch((err) => {
  console.error("Lỗi khi áp dụng style:", err)
  process.exit(1)
})

