import { describe, expect, it } from "vitest"
import ts from "typescript"
import {
  checkR17,
  checkR18,
  checkR19,
  checkR20,
  checkR21,
  checkR22,
  checkR23,
} from "./rules-enterprise"

function createTsxSource(code: string, fileName = "test-card.tsx") {
  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true)
  const context = {
    filePath: `/workspace/src/components/test/${fileName}`,
    relativeFilePath: `src/components/test/${fileName}`,
    sourceCode: code,
  }
  return { sourceFile, context }
}

describe("UX Lint Enterprise Rules (R17–R23)", () => {
  describe("R17 — Legacy Shadcn Tokens", () => {
    it("detects legacy shadcn tokens", () => {
      const { sourceFile, context } = createTsxSource(
        `<div className="bg-background text-foreground border-input" />`
      )
      const violations = checkR17(sourceFile, context)
      expect(violations.length).toBe(3)
      expect(violations[0]!.snippet).toBe("bg-background")
    })

    it("allows semantic tokens", () => {
      const { sourceFile, context } = createTsxSource(
        `<div className="bg-bg text-text border-border bg-surface" />`
      )
      const violations = checkR17(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R18 — Raw HTML Controls", () => {
    it("detects raw HTML controls outside src/components/ui/", () => {
      const { sourceFile, context } = createTsxSource(
        `<div><button type="button">Bấm</button><input placeholder="Nhập" /></div>`
      )
      const violations = checkR18(sourceFile, context)
      expect(violations.length).toBe(2)
      expect(violations[0]!.snippet).toBe("<button>")
      expect(violations[1]!.snippet).toBe("<input>")
    })

    it("detects non-control elements given a widget role", () => {
      const { sourceFile, context } = createTsxSource(
        `<div><div role="button" tabIndex={0}>Bấm</div><span role="checkbox" aria-checked="false" /><div role="dialog" /><Card role="button" /></div>`
      )
      const violations = checkR18(sourceFile, context)
      expect(violations.map((v) => v.snippet)).toEqual(['<div role="button">', '<span role="checkbox">'])
    })

    it("allows system component primitives", () => {
      const { sourceFile, context } = createTsxSource(
        `<div><Button>Bấm</Button><Input placeholder="Nhập" /></div>`
      )
      const violations = checkR18(sourceFile, context)
      expect(violations.length).toBe(0)
    })

    it("skips checks inside src/components/ui/ components", () => {
      const sourceFile = ts.createSourceFile("button.tsx", `<button>Gốc</button>`, ts.ScriptTarget.Latest, true)
      const context = {
        filePath: "/workspace/src/components/ui/button.tsx",
        relativeFilePath: "src/components/ui/button.tsx",
        sourceCode: `<button>Gốc</button>`,
      }
      const violations = checkR18(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R19 — Fixed Inset-0 Overlays", () => {
    it("detects raw fixed inset-0 overlay divs", () => {
      const { sourceFile, context } = createTsxSource(
        `<div className="fixed inset-0 z-50 bg-black/50" />`
      )
      const violations = checkR19(sourceFile, context)
      expect(violations.length).toBe(1)
      expect(violations[0]!.snippet).toBe("fixed inset-0")
    })

    it("allows normal relative and flex positioning", () => {
      const { sourceFile, context } = createTsxSource(
        `<div className="relative flex flex-col p-4" />`
      )
      const violations = checkR19(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R20 — Raw <h1> Outside PageHeader", () => {
    it("detects direct <h1> elements", () => {
      const { sourceFile, context } = createTsxSource(
        `<div><h1>Tiêu đề trang</h1></div>`
      )
      const violations = checkR20(sourceFile, context)
      expect(violations.length).toBe(1)
      expect(violations[0]!.snippet).toBe("<h1>")
    })

    it("allows PageHeader component usage", () => {
      const { sourceFile, context } = createTsxSource(
        `<div><PageHeader title="Tiêu đề trang" /></div>`
      )
      const violations = checkR20(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R21 — Default Tailwind Text Sizes", () => {
    it("detects default Tailwind text sizes", () => {
      const { sourceFile, context } = createTsxSource(
        `<p className="text-xs font-medium text-sm text-base text-lg" />`
      )
      const violations = checkR21(sourceFile, context)
      expect(violations.length).toBe(4)
      expect(violations[0]!.snippet).toBe("text-xs")
    })

    it("allows system typography tokens", () => {
      const { sourceFile, context } = createTsxSource(
        `<p className="text-caption text-body-sm text-body text-title" />`
      )
      const violations = checkR21(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R22 — Nonexistent Token Classes", () => {
    it("detects nonexistent broken token classes", () => {
      const { sourceFile, context } = createTsxSource(
        `<div className="text-primary-fg-broken bg-surface-broken" />`
      )
      const violations = checkR22(sourceFile, context)
      expect(violations.length).toBe(2)
    })

    it("allows valid semantic tokens", () => {
      const { sourceFile, context } = createTsxSource(
        `<div className="text-primary bg-surface" />`
      )
      const violations = checkR22(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R23 — Animations Without Reduced Motion", () => {
    it("detects animate-* without motion-reduce:", () => {
      const { sourceFile, context } = createTsxSource(
        `<div className="animate-spin text-primary" />`
      )
      const violations = checkR23(sourceFile, context)
      expect(violations.length).toBe(1)
      expect(violations[0]!.snippet).toBe("animate-spin")
    })

    it("allows animate-* with motion-reduce: modifier", () => {
      const { sourceFile, context } = createTsxSource(
        `<div className="animate-spin motion-reduce:animate-none text-primary" />`
      )
      const violations = checkR23(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })
})


// CodeQL js/redos (PR #107): tiền tố biến thể "(?:[a-zA-Z0-9:-]+:)*" cho phép nhiều cách khớp chuỗi "-:"
// lặp lại → thời gian khớp tăng theo hàm mũ. Tiền tố mới không chứa ':' trong một đoạn.
describe("Luật màu/token — không backtracking theo hàm mũ (CodeQL js/redos)", () => {
  it("R1 và R17 xử lý lớp có chuỗi '-:' lặp lại dài trong thời gian ngắn", async () => {
    const { checkR1 } = await import("./rules")
    const evil = "a" + "-:".repeat(40) + "!"
    const { sourceFile, context } = createTsxSource(`export const X = () => <div className="${evil} bg-muted hover:bg-red-500" />`)
    const started = Date.now()
    const r1 = checkR1(sourceFile, context)
    const r17 = checkR17(sourceFile, context)
    expect(Date.now() - started).toBeLessThan(500)
    expect(r1.map((v) => v.rule)).toEqual(["R1"])
    expect(r17.map((v) => v.rule)).toEqual(["R17"])
  })
})
