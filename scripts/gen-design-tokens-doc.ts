/**
 * scripts/gen-design-tokens-doc.ts
 *
 * Tự động sinh tài liệu Design Tokens (docs/design-system/tokens.md) từ mã nguồn CSS tokens
 * tại src/styles/tokens/*.css (ADR-011 D-UI-04 & F1-14: Code là SSOT).
 *
 * Cách chạy:
 *   npx tsx scripts/gen-design-tokens-doc.ts         # sinh tệp markdown
 *   npx tsx scripts/gen-design-tokens-doc.ts --check # kiểm tra tính đồng bộ trong CI
 */

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const TOKENS_DIR = path.join(ROOT, "src", "styles", "tokens")
const OUTPUT_FILE = path.join(ROOT, "docs", "design-system", "tokens.md")

interface ParsedToken {
  name: string
  value: string
  comment?: string | undefined
}

interface TokenCategory {
  file: string
  title: string
  description: string
  tokens: ParsedToken[]
}

const CATEGORY_METADATA: Record<string, { title: string; description: string }> = {
  "typography.css": {
    title: "1. Typography Tokens",
    description: "Hệ thống thang cỡ chữ, độ đậm, khoảng cách dòng và họ phông chữ (ADR-011 D-UI-05).",
  },
  "color.css": {
    title: "2. Color Tokens (Semantic & Functional)",
    description: "Bộ màu ngữ nghĩa (primary, surface, border, text, warning, danger, success, info) và 12 thang màu alias.",
  },
  "radius.css": {
    title: "3. Radius Tokens",
    description: "Hệ thống bo góc component và semantic radius (card, button, dialog).",
  },
  "shadow.css": {
    title: "4. Shadow & Elevation Tokens",
    description: "Hệ thống đổ bóng phân tầng theo độ nổi xúc giác.",
  },
  "z-index.css": {
    title: "5. Z-Index Layering Tokens",
    description: "Thang thứ tự lớp xếp chồng phân cấp rõ ràng từ nền đến tooltip.",
  },
  "motion.css": {
    title: "6. Motion & Transition Tokens",
    description: "Thời lượng, gia tốc và cưỡng chế prefers-reduced-motion (WCAG 2.3.3).",
  },
  "spacing.css": {
    title: "7. Spacing & Layout Tokens",
    description: "Khoảng cách ngữ nghĩa khu vực, độ cao điều khiển và độ rộng khung hình.",
  },
  "density.css": {
    title: "8. Density Modes",
    description: "Hai chế độ mật độ: Compact (vận hành/kho/kế toán) và Comfortable (tiêu chuẩn mặc định).",
  },
  "themes.css": {
    title: "9. Multi-Theme Presets",
    description: "3 bộ giao diện chuẩn hóa: Mộc Lan Artisan, Modern Enterprise Slate, và Minimal Pure Swiss.",
  },
}

function parseCssTokens(content: string): ParsedToken[] {
  const tokens: ParsedToken[] = []
  const lines = content.split("\n")

  for (const line of lines) {
    const trimmed = line.trim()
    const match = trimmed.match(/^(--[a-zA-Z0-9-_]+)\s*:\s*([^;]+);(?:\s*\/\*\s*(.*?)\s*\*\/)?/)
    if (match && match[1] && match[2]) {
      tokens.push({
        name: match[1],
        value: match[2].trim(),
        comment: match[3]?.trim(),
      })
    }
  }

  return tokens
}

function generateMarkdown(): string {
  const files = [
    "typography.css",
    "color.css",
    "radius.css",
    "shadow.css",
    "z-index.css",
    "motion.css",
    "spacing.css",
    "density.css",
    "themes.css",
  ]

  const categories: TokenCategory[] = []

  for (const file of files) {
    const filePath = path.join(TOKENS_DIR, file)
    if (!fs.existsSync(filePath)) continue

    const content = fs.readFileSync(filePath, "utf-8")
    const tokens = parseCssTokens(content)
    const meta = CATEGORY_METADATA[file] || { title: file, description: "" }

    categories.push({
      file,
      title: meta.title,
      description: meta.description,
      tokens,
    })
  }

  let md = `# Design Tokens Specification (SSOT)

> **Tự động sinh từ mã nguồn CSS** tại \`src/styles/tokens/*.css\`.
> **Quy tắc bất biến:** Không sửa tệp này thủ công. Mọi thay đổi token phải cập nhật trực tiếp vào tệp CSS tương ứng và chạy \`npm run gen:tokens-doc\`.
> Tuân thủ nghiêm ngặt **ADR-011 (D-UI-01..D-UI-07)**.

---

## Mục lục
${categories.map((c) => `- [${c.title}](#${c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")})`).join("\n")}

---
`

  for (const cat of categories) {
    md += `\n## ${cat.title}\n\n`
    md += `> **Tệp nguồn:** \`src/styles/tokens/${cat.file}\`  \n`
    md += `> ${cat.description}\n\n`

    if (cat.tokens.length === 0) {
      md += `*Xem chi tiết các quy tắc CSS chuyên biệt trong tệp nguồn.*\n\n`
      continue
    }

    md += `| Token CSS | Giá trị mẫu | Ghi chú & Ứng dụng |\n`
    md += `|---|---|---|\n`

    for (const t of cat.tokens) {
      const escapedVal = t.value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|")
      const note = t.comment ? t.comment.replace(/\\/g, "\\\\").replace(/\|/g, "\\|") : "—"
      md += `| \`${t.name}\` | \`${escapedVal}\` | ${note} |\n`
    }

    md += `\n`
  }

  md += `---
*Tài liệu tự động cập nhật bởi \`scripts/gen-design-tokens-doc.ts\` vào CI pipeline.*
`

  return md
}

function main() {
  const isCheck = process.argv.includes("--check")
  const generated = generateMarkdown()

  if (isCheck) {
    if (!fs.existsSync(OUTPUT_FILE)) {
      console.error(`❌ Tệp ${OUTPUT_FILE} chưa tồn tại! Hãy chạy 'npm run gen:tokens-doc'.`)
      process.exit(1)
    }

    const existing = fs.readFileSync(OUTPUT_FILE, "utf-8")
    if (existing.trim() !== generated.trim()) {
      console.error(`❌ Design tokens documentation lệch so với mã CSS!`)
      console.error(`Vui lòng chạy 'npm run gen:tokens-doc' và commit tệp docs/design-system/tokens.md.`)
      process.exit(1)
    }

    console.log(`✅ Design Tokens Specification đồng bộ 100% với mã CSS nguồn!`)
    process.exit(0)
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, generated, "utf-8")
  console.log(`✅ Đã sinh thành công ${path.relative(ROOT, OUTPUT_FILE)} từ ${filesCount(categoriesCount)} token CSS!`)
}

function filesCount(n: number) {
  return "tất cả"
}
const categoriesCount = 9

main()

