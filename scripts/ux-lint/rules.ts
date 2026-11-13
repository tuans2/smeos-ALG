import ts from "typescript"

export interface RuleContext {
  filePath: string
  relativeFilePath: string
  sourceCode: string
  isNewFile?: boolean
}

export interface Violation {
  rule: string
  file: string
  line: number
  column: number
  snippet: string
  message: string
}

export type RuleFunction = (sourceFile: ts.SourceFile, context: RuleContext) => Violation[]

// R1 Pattern (ADR-011 D-UI-01 & F1-10: bắt cả 12 thang màu alias và chuỗi lớp trong object literal/cva)
const RAW_COLOR_REGEX =
  /^(?:[a-zA-Z0-9-]+:)*(?:bg|text|border|from|to|via|ring|fill|stroke|outline|divide|shadow)-(?:red|rose|pink|fuchsia|purple|violet|indigo|blue|sky|cyan|teal|emerald|green|lime|yellow|amber|orange|slate|gray|zinc|neutral|stone|cool|blush|alert|mint|sand|orchid|ocean|azure|navy|petal|aqua|lagoon)-\d{2,3}(?:\/\d+)?$/

// R2 Pattern
const ARBITRARY_TEXT_SIZE_REGEX = /^(?:[a-zA-Z0-9-]+:)*text-\[\d+(?:\.\d+)?px\]$/

// R3 Pattern
const HEX_COLOR_REGEX = /#[0-9a-fA-F]{3,8}\b/g

// R8 Pattern
const TECH_CODE_REGEX = /\bM\d{2}[a-z]?\b|Khu vực [A-F](?:-[A-F])?|\bSSOT\b|Chức năng \d+|\bP\d{2}\b/

// R12 — Từ kỹ thuật cấm xuất hiện trên giao diện người dùng
// Mỗi entry: [pattern, gợi ý thay thế]
// Lưu ý: "credit" và "hex" là thuật ngữ sản phẩm nội bộ đã thiết lập — không kiểm tra.
const BANNED_TERMS_R12: [RegExp, string][] = [
  [/\bBOM\b/g, '"Phiếu nguyên liệu" hoặc "Định mức nguyên liệu"'],
  [/\bMaster Index\b/gi, '"Danh sách tổng hợp" hoặc "Định mức tổng"'],
  [/\bPII\b/g, '"Thông tin khách hàng" hoặc "Dữ liệu cá nhân"'],
  [/\bVision Engine\b/gi, '"Bộ nhận diện ảnh" hoặc "Phân tích ảnh hoa"'],
  [/của hàng/g, '"cửa hàng" (đầy đủ dấu)'],
  [/\bFlorist Ticket\b/gi, '"Phiếu cắm hoa"'],
]

// R9 Pattern
const LOADING_TEXT_REGEX = /^\s*Đang tải(?:\.{3}|…)?\s*$/

function getPosition(sourceFile: ts.SourceFile, node: ts.Node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
  return { line: line + 1, column: character + 1 }
}

function getAttrName(node: ts.JsxAttribute): string {
  if (ts.isIdentifier(node.name)) return node.name.text
  return node.name.name.text
}

/** Extract strings from className attributes and cn/clsx/cva calls */
function collectClassStrings(sourceFile: ts.SourceFile): { text: string; node: ts.Node }[] {
  const results: { text: string; node: ts.Node }[] = []

  function visit(node: ts.Node) {
    if (ts.isJsxAttribute(node) && getAttrName(node) === "className") {
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
      for (const arg of expr.arguments) {
        collectExpressions(arg)
      }
    } else if (ts.isBinaryExpression(expr)) {
      collectExpressions(expr.left)
      collectExpressions(expr.right)
    } else if (ts.isConditionalExpression(expr)) {
      collectExpressions(expr.whenTrue)
      collectExpressions(expr.whenFalse)
    } else if (ts.isArrayLiteralExpression(expr)) {
      for (const elem of expr.elements) {
        collectExpressions(elem)
      }
    }
  }

  visit(sourceFile)
  return results
}

/** R1 — Lớp màu Tailwind thô */
export const checkR1: RuleFunction = (sourceFile, context) => {
  const violations: Violation[] = []
  const classStrings = collectClassStrings(sourceFile)

  for (const { text, node } of classStrings) {
    const tokens = text.split(/\s+/).filter(Boolean)
    for (const token of tokens) {
      if (RAW_COLOR_REGEX.test(token)) {
        const pos = getPosition(sourceFile, node)
        violations.push({
          rule: "R1",
          file: context.relativeFilePath,
          line: pos.line,
          column: pos.column,
          snippet: token,
          message: `Lớp màu Tailwind thô "${token}" — cần dùng token ngữ nghĩa (03a §31).`,
        })
      }
    }
  }
  return violations
}

/** R2 — Cỡ chữ tuỳ ý text-[...px] */
export const checkR2: RuleFunction = (sourceFile, context) => {
  const violations: Violation[] = []
  const classStrings = collectClassStrings(sourceFile)

  for (const { text, node } of classStrings) {
    const tokens = text.split(/\s+/).filter(Boolean)
    for (const token of tokens) {
      if (ARBITRARY_TEXT_SIZE_REGEX.test(token)) {
        const pos = getPosition(sourceFile, node)
        violations.push({
          rule: "R2",
          file: context.relativeFilePath,
          line: pos.line,
          column: pos.column,
          snippet: token,
          message: `Cỡ chữ tuỳ ý "${token}" — cần chuẩn hoá theo thang token (03a §31).`,
        })
      }
    }
  }
  return violations
}

/** R3 — Mã hex trong giao diện */
export const checkR3: RuleFunction = (sourceFile, context) => {
  const violations: Violation[] = []

  function visit(node: ts.Node) {
    if (ts.isJsxAttribute(node)) {
      const attrName = getAttrName(node)
      if (node.initializer) {
        let textVal = ""
        if (ts.isStringLiteral(node.initializer)) {
          textVal = node.initializer.text
        } else if (
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          ts.isStringLiteral(node.initializer.expression)
        ) {
          textVal = node.initializer.expression.text
        }
        if (textVal && HEX_COLOR_REGEX.test(textVal)) {
          const matches = textVal.match(HEX_COLOR_REGEX) || []
          for (const hex of matches) {
            const pos = getPosition(sourceFile, node)
            violations.push({
              rule: "R3",
              file: context.relativeFilePath,
              line: pos.line,
              column: pos.column,
              snippet: `${attrName}="${hex}"`,
              message: `Mã hex "${hex}" trong prop ${attrName} — cần chuyển sang token màu (03a §31).`,
            })
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

/** R4 — Hơn 1 nút chính */
export const checkR4: RuleFunction = (sourceFile, context) => {
  const violations: Violation[] = []
  let primaryButtonCount = 0
  let firstPrimaryNode: ts.Node | null = null

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile)
      if (tagName === "Button") {
        const variantAttr = node.attributes.properties.find(
          (p) => ts.isJsxAttribute(p) && getAttrName(p) === "variant"
        ) as ts.JsxAttribute | undefined

        let isPrimary = false
        if (!variantAttr) {
          // Default variant in Button component is "primary"
          isPrimary = true
        } else if (
          variantAttr.initializer &&
          ts.isStringLiteral(variantAttr.initializer) &&
          variantAttr.initializer.text === "primary"
        ) {
          isPrimary = true
        }

        if (isPrimary) {
          primaryButtonCount++
          if (!firstPrimaryNode) firstPrimaryNode = node
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  if (primaryButtonCount > 1 && firstPrimaryNode) {
    const pos = getPosition(sourceFile, firstPrimaryNode)
    violations.push({
      rule: "R4",
      file: context.relativeFilePath,
      line: pos.line,
      column: pos.column,
      snippet: `<Button> (tổng ${primaryButtonCount} nút primary)`,
      message: `Hơn 1 nút chính (${primaryButtonCount}) trong cùng một màn — vi phạm K2 và 03a UX-010.`,
    })
  }

  return violations
}

/** R5 — onClick trên phần tử không tương tác */
export const checkR5: RuleFunction = (sourceFile, context) => {
  const violations: Violation[] = []
  const nonInteractiveTags = new Set(["div", "span", "li", "tr", "td", "img", "Card"])

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile)
      if (nonInteractiveTags.has(tagName)) {
        const hasOnClick = node.attributes.properties.some(
          (p) => ts.isJsxAttribute(p) && getAttrName(p) === "onClick"
        )
        if (hasOnClick) {
          const hasRole = node.attributes.properties.some(
            (p) => ts.isJsxAttribute(p) && getAttrName(p) === "role"
          )
          const hasTabIndex = node.attributes.properties.some(
            (p) => ts.isJsxAttribute(p) && getAttrName(p) === "tabIndex"
          )
          const hasKeyHandler = node.attributes.properties.some((p) => {
            if (!ts.isJsxAttribute(p)) return false
            const name = getAttrName(p)
            return name === "onKeyDown" || name === "onKeyUp" || name === "onKeyPress"
          })

          // Exemption: modal backdrops with fixed inset-0
          const classAttr = node.attributes.properties.find(
            (p) => ts.isJsxAttribute(p) && getAttrName(p) === "className"
          ) as ts.JsxAttribute | undefined
          const classText = classAttr?.initializer && ts.isStringLiteral(classAttr.initializer)
            ? classAttr.initializer.text
            : ""
          const isModalBackdrop = classText.includes("fixed inset-0") || classText.includes("backdrop")

          if (!hasRole && !hasTabIndex && !hasKeyHandler && !isModalBackdrop) {
            const pos = getPosition(sourceFile, node)
            violations.push({
              rule: "R5",
              file: context.relativeFilePath,
              line: pos.line,
              column: pos.column,
              snippet: `<${tagName} onClick=...>`,
              message: `Phần tử <${tagName}> có onClick nhưng thiếu role/tabIndex/onKeyDown — cần chuyển sang <button type="button"> (03a §17, WCAG 2.1.1).`,
            })
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

/** R6 — Nút chỉ có icon thiếu nhãn */
export const checkR6: RuleFunction = (sourceFile, context) => {
  const violations: Violation[] = []

  function visit(node: ts.Node) {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement
      const tagName = opening.tagName.getText(sourceFile)
      if (tagName === "button" || tagName === "Button") {
        const hasAriaLabel = opening.attributes.properties.some((p) => {
          if (!ts.isJsxAttribute(p)) return false
          const name = getAttrName(p)
          return name === "aria-label" || name === "aria-labelledby" || name === "title"
        })

        if (!hasAriaLabel) {
          // Check if children contain only icon components and no visible text
          const nonWhitespaceChildren = node.children.filter((c) => {
            if (ts.isJsxText(c)) {
              return c.getText(sourceFile).trim().length > 0
            }
            return true
          })

          const onlyIconChildren =
            nonWhitespaceChildren.length > 0 &&
            nonWhitespaceChildren.every((c) => {
              if (ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c)) {
                const childTag = (
                  ts.isJsxElement(c) ? c.openingElement.tagName : c.tagName
                ).getText(sourceFile)
                // Common Lucide icon names start with uppercase letter
                return /^[A-Z]/.test(childTag) && (childTag.endsWith("Icon") || childTag.length <= 20)
              }
              return false
            })

          if (onlyIconChildren) {
            const pos = getPosition(sourceFile, opening)
            violations.push({
              rule: "R6",
              file: context.relativeFilePath,
              line: pos.line,
              column: pos.column,
              snippet: `<${tagName}>`,
              message: `Nút chỉ có icon mà thiếu aria-label hoặc title — vi phạm WCAG 4.1.2.`,
            })
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

/** R7 — Ảnh thiếu alt */
export const checkR7: RuleFunction = (sourceFile, context) => {
  const violations: Violation[] = []

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile)
      if (tagName === "img" || tagName === "Image") {
        const hasAlt = node.attributes.properties.some(
          (p) => ts.isJsxAttribute(p) && getAttrName(p) === "alt"
        )
        if (!hasAlt) {
          const pos = getPosition(sourceFile, node)
          violations.push({
            rule: "R7",
            file: context.relativeFilePath,
            line: pos.line,
            column: pos.column,
            snippet: `<${tagName} src=...>`,
            message: `Thẻ <${tagName}> thiếu thuộc tính alt — vi phạm WCAG 1.1.1.`,
          })
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

/** R8 — Mã kỹ thuật trong nhãn */
export const checkR8: RuleFunction = (sourceFile, context) => {
  const violations: Violation[] = []

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) {
      const text = node.getText(sourceFile)
      const match = text.match(TECH_CODE_REGEX)
      if (match) {
        const pos = getPosition(sourceFile, node)
        violations.push({
          rule: "R8",
          file: context.relativeFilePath,
          line: pos.line,
          column: pos.column,
          snippet: match[0],
          message: `Mã kỹ thuật "${match[0]}" xuất hiện trong giao diện — người dùng hoa không hiểu (03a §39).`,
        })
      }
    } else if (ts.isJsxAttribute(node)) {
      const attrName = getAttrName(node)
      if (["label", "title", "badge"].includes(attrName) && node.initializer) {
        let textVal = ""
        if (ts.isStringLiteral(node.initializer)) {
          textVal = node.initializer.text
        }
        if (textVal) {
          const match = textVal.match(TECH_CODE_REGEX)
          if (match) {
            const pos = getPosition(sourceFile, node)
            violations.push({
              rule: "R8",
              file: context.relativeFilePath,
              line: pos.line,
              column: pos.column,
              snippet: `${attrName}="${match[0]}"`,
              message: `Mã kỹ thuật "${match[0]}" trong prop ${attrName} — cần chuyển sang nhãn nghiệp vụ (03a §39).`,
            })
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

/** R9 — "Đang tải" dạng chữ */
export const checkR9: RuleFunction = (sourceFile, context) => {
  const violations: Violation[] = []

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) {
      const text = node.getText(sourceFile)
      if (LOADING_TEXT_REGEX.test(text)) {
        const pos = getPosition(sourceFile, node)
        violations.push({
          rule: "R9",
          file: context.relativeFilePath,
          line: pos.line,
          column: pos.column,
          snippet: text.trim(),
          message: `Chữ "Đang tải…" trơ trụi — cần thay bằng <SkeletonBlock /> (03-UX §15).`,
        })
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

/** R10 — Thiếu nhánh rỗng/lỗi khi có gọi API */
export const checkR10: RuleFunction = (sourceFile, context) => {
  const violations: Violation[] = []
  const text = context.sourceCode

  // Only check files that perform data fetching
  const hasFetch = text.includes("fetch(") || text.includes("layJson(")
  if (hasFetch) {
    const hasErrorIndicator =
      text.includes("EmptyState") ||
      text.includes("InlineError") ||
      text.includes("role=\"alert\"") ||
      text.includes("catch") ||
      text.includes("length === 0") ||
      text.includes("error")

    if (!hasErrorIndicator) {
      violations.push({
        rule: "R10",
        file: context.relativeFilePath,
        line: 1,
        column: 1,
        snippet: "fetch()",
        message: `Trang có gọi API nhưng thiếu trạng thái rỗng / lỗi (EmptyState, InlineError) — vi phạm 03a §24.`,
      })
    }
  }

  return violations
}

/** R11 — Nút không làm gì */
export const checkR11: RuleFunction = (sourceFile, context) => {
  const violations: Violation[] = []

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile)
      if (tagName === "button" || tagName === "Button") {
        const hasOnClick = node.attributes.properties.some(
          (p) => ts.isJsxAttribute(p) && getAttrName(p) === "onClick"
        )
        const hasTypeSubmit = node.attributes.properties.some(
          (p) =>
            ts.isJsxAttribute(p) &&
            getAttrName(p) === "type" &&
            p.initializer &&
            ts.isStringLiteral(p.initializer) &&
            p.initializer.text === "submit"
        )
        const hasAsChild = node.attributes.properties.some(
          (p) => ts.isJsxAttribute(p) && getAttrName(p) === "asChild"
        )

        if (!hasOnClick && !hasTypeSubmit && !hasAsChild) {
          // If neither, verify it isn't inside a form or link
          let parent = node.parent
          let insideFormOrLink = false
          while (parent) {
            if (ts.isJsxElement(parent)) {
              const pTag = parent.openingElement.tagName.getText(sourceFile)
              if (pTag === "form" || pTag === "Link" || pTag === "a") {
                insideFormOrLink = true
                break
              }
            }
            parent = parent.parent
          }

          if (!insideFormOrLink) {
            const pos = getPosition(sourceFile, node)
            violations.push({
              rule: "R11",
              file: context.relativeFilePath,
              line: pos.line,
              column: pos.column,
              snippet: `<${tagName}>`,
              message: `Nút <${tagName}> không có onClick, không phải type="submit", không nằm trong Link/form (03a §22).`,
            })
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

/** R12 — Từ kỹ thuật cấm xuất hiện trong văn bản giao diện */
export const checkR12: RuleFunction = (sourceFile, context) => {
  const violations: Violation[] = []
  const VISIBLE_PROPS = new Set(["label", "title", "placeholder", "badgeLabel", "description", "tips"])

  function checkText(text: string, node: ts.Node, propName?: string) {
    for (const [pattern, suggestion] of BANNED_TERMS_R12) {
      const match = text.match(pattern)
      if (match) {
        const pos = getPosition(sourceFile, node)
        const location = propName ? `prop ${propName}` : "văn bản JSX"
        violations.push({
          rule: "R12",
          file: context.relativeFilePath,
          line: pos.line,
          column: pos.column,
          snippet: match[0],
          message: `Từ cấm "${match[0]}" trong ${location} — thay bằng ${suggestion} (Copywriting Standard R12).`,
        })
      }
    }
  }

  function visit(node: ts.Node) {
    // Kiểm tra JSX text node trực tiếp
    if (ts.isJsxText(node)) {
      const text = node.getText(sourceFile).trim()
      if (text) checkText(text, node)
    }
    // Kiểm tra props hiển thị văn bản
    else if (ts.isJsxAttribute(node)) {
      const attrName = getAttrName(node)
      if (VISIBLE_PROPS.has(attrName) && node.initializer) {
        if (ts.isStringLiteral(node.initializer)) {
          checkText(node.initializer.text, node, attrName)
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

export const ALL_RULES: Record<string, RuleFunction> = {
  R1: checkR1,
  R2: checkR2,
  R3: checkR3,
  R4: checkR4,
  R5: checkR5,
  R6: checkR6,
  R7: checkR7,
  R8: checkR8,
  R9: checkR9,
  R10: checkR10,
  R11: checkR11,
  R12: checkR12,
}
