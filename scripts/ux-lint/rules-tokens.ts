import { readFileSync } from "node:fs"
import { join } from "node:path"
import ts from "typescript"
import type { RuleFunction, Violation } from "./rules"

/**
 * R24 — Lớp màu dùng tên token không tồn tại.
 * Tailwind chỉ sinh quy tắc cho màu có `--color-<tên>` trong `src/styles/tokens/*.css` / `src/app/globals.css`.
 * Lớp như `bg-surface-muted` không có token thì không sinh CSS: phần tử không có nền (có thể là chữ tối trên nền tối).
 * Quản lý theo cơ chế ratchet: nợ cũ khoá ở baseline, chặn lớp mới.
 */

const REPO_ROOT = join(__dirname, "..", "..")
const TOKEN_FILES = ["src/styles/tokens/color.css", "src/styles/tokens/themes.css", "src/app/globals.css"]
const FAMILIES = "primary|secondary|accent|warning|danger|success|info|surface"
const COLOR_CLASS = new RegExp(
  `(?<![\\w-])((?:[a-z-]+:)*)(bg|text|border|ring|from|to|via|fill|stroke|divide|outline|decoration|shadow)-((?:${FAMILIES})(?:-[a-z]+)?)(?:\\/\\d+)?(?![\\w-])`,
  "g"
)

let cachedTokens: Set<string> | null = null

/** Tên màu có thật (phần sau `--color-`). Đọc một lần mỗi lần chạy. */
export function definedColorTokens(root: string = REPO_ROOT): Set<string> {
  if (cachedTokens && root === REPO_ROOT) return cachedTokens
  const names = new Set<string>()
  for (const file of TOKEN_FILES) {
    try {
      for (const m of readFileSync(join(root, file), "utf-8").matchAll(/--color-([a-z0-9-]+)\s*:/g)) names.add(m[1]!)
    } catch {
      /* thiếu tệp: không có token từ tệp đó */
    }
  }
  if (root === REPO_ROOT) cachedTokens = names
  return names
}

/** Tên màu trong `text` mà không có token. Hàm thuần để test. */
export function findUndefinedColorClasses(text: string, tokens: ReadonlySet<string>): { cls: string; token: string }[] {
  const out: { cls: string; token: string }[] = []
  for (const m of text.matchAll(COLOR_CLASS)) {
    const token = m[3]!
    if (!tokens.has(token)) out.push({ cls: m[0].replace(/^[a-z-]+:/, ""), token })
  }
  return out
}

export const checkR24: RuleFunction = (sourceFile, context) => {
  const out: Violation[] = []
  const tokens = definedColorTokens()
  function report(node: ts.Node, text: string) {
    if (!/(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|decoration|shadow)-/.test(text)) return
    for (const { cls, token } of findUndefinedColorClasses(text, tokens)) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
      out.push({
        rule: "R24",
        file: context.relativeFilePath,
        line: line + 1,
        column: character + 1,
        snippet: cls,
        message: `Lớp "${cls}" dùng màu "${token}" không có token trong src/styles/tokens — Tailwind không sinh CSS nên phần tử không có màu. Dùng token có thật (vd. surface-alt, primary-muted, warning-bg).`,
      })
    }
  }
  function visit(node: ts.Node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) report(node, node.text)
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) report(node, node.text)
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return out
}

export const TOKEN_RULES: Record<string, RuleFunction> = { R24: checkR24 }
