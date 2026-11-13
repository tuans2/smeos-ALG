import ts from "typescript"
import type { RuleContext, RuleFunction, Violation } from "./rules"

/**
 * Luật UX Lint Enterprise R17–R23 (ADR-011 D-UI-07, GĐ 1 F1-10).
 * Quản lý theo cơ chế ratchet: nợ cũ khoá ở baseline, chặn đứng vi phạm mới.
 */

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
  message: string
): Violation {
  return { rule, file: context.relativeFilePath, ...at(sourceFile, node), snippet, message }
}

function collectClassStrings(sourceFile: ts.SourceFile): { text: string; node: ts.Node }[] {
  const results: { text: string; node: ts.Node }[] = []

  function visit(node: ts.Node) {
    if (ts.isJsxAttribute(node) && (ts.isIdentifier(node.name) ? node.name.text : node.name.name.text) === "className") {
      if (node.initializer) {
        if (ts.isStringLiteral(node.initializer)) {
          results.push({ text: node.initializer.text, node: node.initializer })
        } else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
          collectExpressions(node.initializer.expression)
        }
      }
    } else if (ts.isCallExpression(node)) {
      const calleeText = node.expression.getText(sourceFile)
      if (calleeText === "cn" || calleeText === "clsx" || calleeText === "cva") {
        for (const arg of node.arguments) {
          collectExpressions(arg)
        }
      }
    } else if (ts.isPropertyAssignment(node)) {
      const propName = node.name.getText(sourceFile)
      if (/class|className|style|badge|color|variant/i.test(propName) && node.initializer) {
        collectExpressions(node.initializer)
      }
    }
    ts.forEachChild(node, visit)
  }

  function collectExpressions(expr: ts.Expression) {
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
      results.push({ text: expr.text, node: expr })
    } else if (ts.isTemplateExpression(expr)) {
      results.push({ text: expr.head.text, node: expr.head })
      for (const span of expr.templateSpans) {
        collectExpressions(span.expression)
        results.push({ text: span.literal.text, node: span.literal })
      }
    } else if (ts.isCallExpression(expr)) {
      for (const arg of expr.arguments) collectExpressions(arg)
    } else if (ts.isBinaryExpression(expr)) {
      collectExpressions(expr.left)
      collectExpressions(expr.right)
    } else if (ts.isConditionalExpression(expr)) {
      collectExpressions(expr.whenTrue)
      collectExpressions(expr.whenFalse)
    } else if (ts.isArrayLiteralExpression(expr)) {
      for (const elem of expr.elements) collectExpressions(elem)
    }
  }

  visit(sourceFile)
  return results
}

// R17 Pattern — Token shadcn cũ
const LEGACY_SHADCN_TOKEN_REGEX =
  /^(?:[a-zA-Z0-9-]+:)*(?:bg-background|text-foreground|text-muted-foreground|border-input|bg-card|text-card-foreground|bg-popover|text-popover-foreground|bg-muted|border-muted)$/

/** R17 — Token shadcn cũ → token ngữ nghĩa */
export const checkR17: RuleFunction = (sourceFile, context) => {
  const out: Violation[] = []
  const strings = collectClassStrings(sourceFile)
  for (const { text, node } of strings) {
    const tokens = text.split(/\s+/).filter(Boolean)
    for (const token of tokens) {
      if (LEGACY_SHADCN_TOKEN_REGEX.test(token)) {
        out.push(
          violation(
            "R17",
            sourceFile,
            context,
            node,
            token,
            `Token shadcn cũ "${token}" — thay bằng token ngữ nghĩa (bg-bg, text-text, text-text-muted, border-border, bg-surface, bg-surface-alt) theo ADR-011 D-UI-01.`
          )
        )
      }
    }
  }
  return out
}

const RAW_CONTROL_TAGS = new Set(["button", "input", "select", "textarea"])
/** Vai trò điều khiển gắn lên phần tử không phải điều khiển (vd `<div role="button">`) — né R18 và mất hành vi gốc. */
const WIDGET_ROLES = new Set(["button", "checkbox", "radio", "switch", "menuitem", "menuitemradio", "menuitemcheckbox", "option", "tab"])

function widgetRoleOf(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, sourceFile: ts.SourceFile): string | null {
  for (const attr of node.attributes.properties) {
    if (ts.isJsxAttribute(attr) && attr.name.getText(sourceFile) === "role" && attr.initializer && ts.isStringLiteral(attr.initializer)) {
      return WIDGET_ROLES.has(attr.initializer.text) ? attr.initializer.text : null
    }
  }
  return null
}

/** R18 — Thẻ điều khiển HTML thô ngoài src/components/ui/ */
export const checkR18: RuleFunction = (sourceFile, context) => {
  if (isSharedUi(context)) return []
  const out: Violation[] = []

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sourceFile)
      const role = /^[a-z]/.test(tag) && !RAW_CONTROL_TAGS.has(tag) ? widgetRoleOf(node, sourceFile) : null
      if (role) {
        out.push(
          violation(
            "R18",
            sourceFile,
            context,
            node,
            `<${tag} role="${role}">`,
            `<${tag} role="${role}"> giả lập điều khiển — dùng component hệ thống (Button, Checkbox, RadioGroup, Switch…) từ src/components/ui/ theo ADR-011 D-UI-07.`
          )
        )
      }
      if (RAW_CONTROL_TAGS.has(tag)) {
        // Bỏ qua input type="hidden" hoặc type="file"
        let isHiddenOrFile = false
        for (const attr of node.attributes.properties) {
          if (ts.isJsxAttribute(attr) && attr.name.getText(sourceFile) === "type" && attr.initializer) {
            const val = ts.isStringLiteral(attr.initializer) ? attr.initializer.text : ""
            if (val === "hidden" || val === "file") isHiddenOrFile = true
          }
        }
        if (!isHiddenOrFile) {
          out.push(
            violation(
              "R18",
              sourceFile,
              context,
              node,
              `<${tag}>`,
              `Thẻ điều khiển HTML thô <${tag}> ngoài src/components/ui/ — dùng component hệ thống từ src/components/ui/ theo ADR-011 D-UI-07.`
            )
          )
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return out
}

/** R19 — Overlay fixed inset-0 ngoài src/components/ui/ */
export const checkR19: RuleFunction = (sourceFile, context) => {
  if (isSharedUi(context)) return []
  const out: Violation[] = []
  const strings = collectClassStrings(sourceFile)

  for (const { text, node } of strings) {
    if (text.includes("fixed") && text.includes("inset-0")) {
      out.push(
        violation(
          "R19",
          sourceFile,
          context,
          node,
          "fixed inset-0",
          `Overlay "fixed inset-0" ngoài src/components/ui/ — dùng Dialog/Drawer từ src/components/ui/ theo ADR-011 D-UI-07.`
        )
      )
    }
  }
  return out
}

/** R20 — Thẻ <h1> trực tiếp ngoài PageHeader */
export const checkR20: RuleFunction = (sourceFile, context) => {
  if (isSharedUi(context) || context.relativeFilePath.includes("page-header.tsx")) return []
  const out: Violation[] = []

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText(sourceFile) === "h1") {
        out.push(
          violation(
            "R20",
            sourceFile,
            context,
            node,
            "<h1>",
            "Thẻ <h1> trực tiếp ngoài PageHeader — dùng <PageHeader> theo ADR-011 D-UI-05."
          )
        )
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return out
}

// R21 Pattern — Cỡ chữ Tailwind mặc định
const TAILWIND_DEFAULT_TEXT_SIZE_REGEX =
  /^(?:[a-zA-Z0-9-]+:)*text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)$/

/** R21 — Cỡ chữ Tailwind mặc định → thang typography hệ thống */
export const checkR21: RuleFunction = (sourceFile, context) => {
  const out: Violation[] = []
  const strings = collectClassStrings(sourceFile)

  for (const { text, node } of strings) {
    const tokens = text.split(/\s+/).filter(Boolean)
    for (const token of tokens) {
      if (TAILWIND_DEFAULT_TEXT_SIZE_REGEX.test(token)) {
        out.push(
          violation(
            "R21",
            sourceFile,
            context,
            node,
            token,
            `Cỡ chữ Tailwind mặc định "${token}" — dùng thang typography hệ thống (text-caption, text-body-sm, text-body, text-title-sm, text-title, text-display) theo ADR-011 D-UI-05.`
          )
        )
      }
    }
  }
  return out
}

// R22 Pattern — Token không tồn tại
const NONEXISTENT_TOKEN_REGEX = /^(?:[a-zA-Z0-9-]+:)*(?:bg|text|border)-(?:primary-fg-broken|surface-broken)$/

/** R22 — Lớp token không tồn tại */
export const checkR22: RuleFunction = (sourceFile, context) => {
  const out: Violation[] = []
  const strings = collectClassStrings(sourceFile)

  for (const { text, node } of strings) {
    const tokens = text.split(/\s+/).filter(Boolean)
    for (const token of tokens) {
      if (NONEXISTENT_TOKEN_REGEX.test(token)) {
        out.push(
          violation(
            "R22",
            sourceFile,
            context,
            node,
            token,
            `Lớp token không tồn tại "${token}" theo ADR-011 D-UI-07.`
          )
        )
      }
    }
  }
  return out
}

// R23 Pattern — animate-* thiếu motion-reduce
const ANIMATE_REGEX = /^(?:[a-zA-Z0-9-]+:)*animate-(?:spin|pulse|bounce|ping)$/

/** R23 — animate-* không kèm motion-reduce: */
export const checkR23: RuleFunction = (sourceFile, context) => {
  const out: Violation[] = []
  const strings = collectClassStrings(sourceFile)

  for (const { text, node } of strings) {
    const tokens = text.split(/\s+/).filter(Boolean)
    const hasAnimation = tokens.some((t) => ANIMATE_REGEX.test(t))
    const hasMotionReduce = tokens.some((t) => t.includes("motion-reduce:"))

    if (hasAnimation && !hasMotionReduce) {
      const animToken = tokens.find((t) => ANIMATE_REGEX.test(t)) || "animate-*"
      out.push(
        violation(
          "R23",
          sourceFile,
          context,
          node,
          animToken,
          `Lớp hoạt hoạ "${animToken}" thiếu "motion-reduce:animate-none" — cần hỗ trợ prefers-reduced-motion theo WCAG 2.3.3 / ADR-011 D-UI-07.`
        )
      )
    }
  }
  return out
}

export const ENTERPRISE_RULES: Record<string, RuleFunction> = {
  R17: checkR17,
  R18: checkR18,
  R19: checkR19,
  R20: checkR20,
  R21: checkR21,
  R22: checkR22,
  R23: checkR23,
}

