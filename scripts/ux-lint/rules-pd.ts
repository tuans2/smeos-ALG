import ts from "typescript"
import type { RuleContext, RuleFunction, Violation } from "./rules"

/**
 * Luật UX Lint R13–R16 của chuẩn Progressive Disclosure (docs/dac-ta/03c-ux-progressive-disclosure.md §7).
 * Chạy theo ratchet như R1–R12: nợ cũ khoá ở baseline, chỉ chặn vi phạm mới.
 */

/** Component dùng chung định nghĩa chính các pattern này — không tự bắt lỗi chính mình. */
function isSharedUi(context: RuleContext): boolean {
  return context.relativeFilePath.startsWith("src/components/ui/")
}

function at(sourceFile: ts.SourceFile, node: ts.Node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
  return { line: line + 1, column: character + 1 }
}

function violation(
  rule: string,
  sourceFile: ts.SourceFile,
  context: RuleContext,
  node: ts.Node,
  snippet: string,
  message: string,
): Violation {
  return { rule, file: context.relativeFilePath, ...at(sourceFile, node), snippet, message }
}

/** Hộp thoại chặn luồng của trình duyệt → thành phần chuẩn tương ứng. */
const NATIVE_DIALOGS: Record<string, string> = {
  confirm: "Hộp confirm() của trình duyệt — dùng ConfirmDialog/useConfirmDialog (03c UX-015).",
  alert: "Hộp alert() của trình duyệt — dùng useToast() hoặc lỗi tại chỗ (InlineError) (03c UX-015).",
  prompt: "Hộp prompt() của trình duyệt — dùng usePromptDialog (03c UX-015).",
}

/** R13 — `confirm()`/`alert()`/`prompt()` của trình duyệt → ConfirmDialog / Toast / PromptDialog (UX-015). */
export const checkR13: RuleFunction = (sourceFile, context) => {
  if (isSharedUi(context)) return []
  const out: Violation[] = []
  // Hàm cục bộ cùng tên (vd hành động "Xác nhận" của màn, `const [confirm] = useConfirmDialog()`) không phải hộp của trình duyệt.
  const declaresLocal = (name: string) =>
    new RegExp(`\\b(?:function|const|let)\\s+(?:\\[\\s*)?${name}\\b`).test(context.sourceCode)
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      const bareName = ts.isIdentifier(callee) && callee.text in NATIVE_DIALOGS ? callee.text : null
      const windowName =
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text in NATIVE_DIALOGS &&
        ts.isIdentifier(callee.expression) &&
        (callee.expression.text === "window" || callee.expression.text === "globalThis")
          ? callee.name.text
          : null
      const name = windowName ?? (bareName && !declaresLocal(bareName) ? bareName : null)
      if (name) out.push(violation("R13", sourceFile, context, node, `${name}(`, NATIVE_DIALOGS[name]!))
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return out
}

// Chỉ các tên ngoài từ vựng chuẩn — `queued`/`running`/`succeeded`/`canceled` là TaskUiState hợp lệ.
const RAW_TASK_STATES = new Set(["done", "completed", "processing", "cancelled"])

/** R14 — so sánh với chuỗi trạng thái tác vụ tự đặt → dùng `task-state.ts` (UX-016). */
export const checkR14: RuleFunction = (sourceFile, context) => {
  if (isSharedUi(context)) return []
  const out: Violation[] = []
  function visit(node: ts.Node) {
    if (
      ts.isBinaryExpression(node) &&
      [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.operatorToken.kind)
    ) {
      for (const side of [node.left, node.right]) {
        if (ts.isStringLiteral(side) && RAW_TASK_STATES.has(side.text)) {
          out.push(
            violation("R14", sourceFile, context, side, `"${side.text}"`, `Trạng thái tác vụ tự đặt "${side.text}" — dùng TaskUiState trong src/lib/ui-system/task-state.ts (03c UX-016).`),
          )
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return out
}

/** R15 — `<details>` tự viết → `Disclosure` (UX-017). */
export const checkR15: RuleFunction = (sourceFile, context) => {
  if (isSharedUi(context)) return []
  const out: Violation[] = []
  function visit(node: ts.Node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(sourceFile) === "details") {
      out.push(violation("R15", sourceFile, context, node, "<details>", "Vùng mở rộng tự viết — dùng Disclosure từ src/components/ui/disclosure.tsx (03c UX-017)."))
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return out
}

/** R16 — từ cấm theo docs/dac-ta/ux-patterns/glossary.md (UX-026). */
const GLOSSARY_BANNED: [RegExp, string][] = [
  [/\bWorker\b/, '"hệ thống" hoặc bỏ hẳn'],
  [/\b[Rr]ender(?:ing)?\b/, '"dựng" (Đang dựng video, Đã dựng xong)'],
  [/\bjob\b/, '"tác vụ" hoặc bỏ mã'],
  [/\bP\d\b/, "tên bước nghiệp vụ (Duyệt kịch bản, Duyệt video)"],
  [/\bBOM\b|\bBill of Materials\b/i, '"định lượng nguyên vật liệu" hoặc "công thức chế tác"'],
  [/\bMaster Index\b/i, '"danh mục tổng hợp" hoặc "thư viện chuẩn"'],
  [/\bPII\b/, '"thông tin cá nhân khách hàng"'],
  [/\bControl Tower\b/i, '"tháp điều phối đơn"'],
  [/\b[Pp]ayload\b|\bRequest body\b/i, '"dữ liệu gửi lên" hoặc "thông tin nhập liệu"'],
  [/\b[Tt]enants?\b/, '"cửa hàng" hoặc "doanh nghiệp / tổ chức" theo tầng'],
  [/(?<!Apple )\bM[0-5]\b/, '"tiến độ xử lý" kèm tên bước (Nhận đơn → Chế tác → Giao hàng)'],
  [/\bM(?:0[1-9]|1\d)[a-z]?\b/, "tên chức năng (không hiện mã nội bộ M01, M01a…)"],
  [/\bR[1-9]\b/, 'tên mức: "rủi ro cao", "tiêu chuẩn"'],
  [/\bSales? [Pp]itch\b/, '"kịch bản tư vấn"'],
]

/** Thuộc tính object mang chữ hiển thị (mảng tab, bước, mục chọn…) — soát cả ngoài JSX. */
const DISPLAY_KEYS = new Set([
  "label", "title", "shortTitle", "subtitle", "description", "desc", "text", "message",
  "reason", "hint", "placeholder", "tooltip", "caption", "heading", "helperText", "emptyText", "ctaLabel",
])

const VISIBLE_PROPS = new Set(["label", "title", "placeholder", "description", "aria-label"])

export const checkR16: RuleFunction = (sourceFile, context) => {
  const out: Violation[] = []
  function check(text: string, node: ts.Node, isTemplate = false) {
    // Đường dẫn, khoá, giá trị so sánh ("/job", "render_completed") không phải chữ hiển thị.
    if (!isTemplate && /^[\w\-./:?=&]*$/.test(text.trim())) return
    for (const [pattern, suggestion] of GLOSSARY_BANNED) {
      const match = text.match(pattern)
      if (match) {
        out.push(violation("R16", sourceFile, context, node, match[0], `Từ "${match[0]}" trên giao diện — thay bằng ${suggestion} (03c UX-026).`))
      }
    }
  }
  function visit(node: ts.Node, insideJsx: boolean) {
    if (ts.isJsxText(node)) {
      check(node.getText(sourceFile), node)
    } else if (ts.isJsxAttribute(node)) {
      const name = ts.isIdentifier(node.name) ? node.name.text : node.name.name.text
      if (VISIBLE_PROPS.has(name) && node.initializer && ts.isStringLiteral(node.initializer)) check(node.initializer.text, node)
      if (name === "className" || name === "key" || name === "href" || name === "src") return
    } else if (ts.isPropertyAssignment(node) && !insideJsx) {
      const key = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : ""
      const init = node.initializer
      if (DISPLAY_KEYS.has(key)) {
        if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) check(init.text, init)
        else if (ts.isTemplateExpression(init)) check([init.head.text, ...init.templateSpans.map((s) => s.literal.text)].join(" "), init, true)
      }
    } else if (insideJsx && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
      check(node.text, node)
    } else if (insideJsx && ts.isTemplateExpression(node)) {
      check([node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(" "), node, true)
    }
    const nextInside = insideJsx || ts.isJsxExpression(node)
    // Chuỗi truyền thẳng vào lời gọi hàm (fetch, cn, t()…) không phải chữ hiển thị;
    // hàm callback (.map((v) => `…`)) thì vẫn soát.
    if (ts.isCallExpression(node)) {
      visit(node.expression, nextInside)
      for (const arg of node.arguments) {
        if (!ts.isStringLiteralLike(arg) && !ts.isTemplateExpression(arg)) visit(arg, nextInside)
      }
      return
    }
    ts.forEachChild(node, (child) => visit(child, nextInside))
  }
  visit(sourceFile, false)
  return out
}

export const PD_RULES: Record<string, RuleFunction> = {
  R13: checkR13,
  R14: checkR14,
  R15: checkR15,
  R16: checkR16,
}
