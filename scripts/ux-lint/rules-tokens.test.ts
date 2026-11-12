import { describe, expect, it } from "vitest"
import ts from "typescript"
import { checkR24, definedColorTokens, findUndefinedColorClasses } from "./rules-tokens"

function run(code: string) {
  const sourceFile = ts.createSourceFile("card.tsx", code, ts.ScriptTarget.Latest, true)
  return checkR24(sourceFile, { filePath: "/w/src/components/card.tsx", relativeFilePath: "src/components/card.tsx", sourceCode: code })
}

describe("R24 — lớp màu dùng token không tồn tại", () => {
  it("đọc được token thật từ src/styles/tokens", () => {
    const t = definedColorTokens()
    expect(t.has("surface-alt")).toBe(true)
    expect(t.has("primary-muted")).toBe(true)
    expect(t.has("warning-text")).toBe(true)
    expect(t.has("surface-muted")).toBe(false)
  })

  it("bắt lớp có biến thể, độ trong suốt và bỏ qua token có thật", () => {
    const t = new Set(["surface-alt", "primary", "warning-bg"])
    const found = findUndefinedColorClasses("bg-surface-muted hover:bg-primary-subtle/50 bg-surface-alt text-primary bg-warning-bg", t)
    expect(found.map((f) => f.token)).toEqual(["surface-muted", "primary-subtle"])
    expect(found[1]!.cls).toBe("bg-primary-subtle/50")
  })

  it("không báo lớp ngoài các họ màu của hệ thống", () => {
    expect(findUndefinedColorClasses("text-text-muted border-border bg-bg shadow-sm", new Set())).toEqual([])
  })

  it("bắt trong chuỗi className, cn() và template literal", () => {
    expect(run('const a = <div className="bg-surface-muted p-2" />').length).toBe(1)
    expect(run('const b = cn("flex", cond && "bg-primary-subtle")').length).toBe(1)
    expect(run("const c = `rounded ${x} bg-surface-raised`").length).toBe(1)
  })

  it("không báo khi dùng token có thật", () => {
    expect(run('const a = <div className="bg-surface-alt text-warning-text border-primary-border" />')).toEqual([])
  })
})
