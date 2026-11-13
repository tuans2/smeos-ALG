import { describe, expect, it } from "vitest"
import ts from "typescript"
import {
  checkR1,
  checkR2,
  checkR3,
  checkR4,
  checkR5,
  checkR6,
  checkR7,
  checkR8,
  checkR9,
  checkR10,
  checkR11,
  type Violation,
} from "./rules"
import { isAllowlisted } from "./report"

function createTsxSource(code: string, fileName = "test.tsx") {
  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true)
  const context = {
    filePath: `/workspace/src/components/${fileName}`,
    relativeFilePath: `src/components/${fileName}`,
    sourceCode: code,
  }
  return { sourceFile, context }
}

describe("UX Lint Rules (R1–R11)", () => {
  describe("R1 — Raw Tailwind Colors", () => {
    it("detects raw Tailwind color classes", () => {
      const { sourceFile, context } = createTsxSource(
        `<div className="bg-red-500 text-rose-700 border-emerald-600" />`
      )
      const violations = checkR1(sourceFile, context)
      expect(violations.length).toBe(3)
      expect(violations[0]!.snippet).toBe("bg-red-500")
    })

    it("detects alias scale colors (R1 extended)", () => {
      const { sourceFile, context } = createTsxSource(
        `<div className="bg-cool-100 text-blush-700 border-sand-300" />`
      )
      const violations = checkR1(sourceFile, context)
      expect(violations.length).toBe(3)
    })

    it("allows semantic token colors", () => {
      const { sourceFile, context } = createTsxSource(
        `<div className="bg-primary text-danger border-border bg-surface text-text" />`
      )
      const violations = checkR1(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R2 — Arbitrary Font Sizes", () => {
    it("detects text-[Npx]", () => {
      const { sourceFile, context } = createTsxSource(`<span className="text-[13.5px] font-bold" />`)
      const violations = checkR2(sourceFile, context)
      expect(violations.length).toBe(1)
      expect(violations[0]!.snippet).toBe("text-[13.5px]")
    })

    it("allows standard Tailwind sizes", () => {
      const { sourceFile, context } = createTsxSource(`<span className="text-xs text-sm text-base" />`)
      const violations = checkR2(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R3 — Hex Codes in JSX", () => {
    it("detects hex codes in attributes", () => {
      const { sourceFile, context } = createTsxSource(`<svg color="#FF5500" fill="#aabbcc" />`)
      const violations = checkR3(sourceFile, context)
      expect(violations.length).toBe(2)
      expect(violations[0]!.snippet).toContain("#FF5500")
    })

    it("passes when no hex codes are present", () => {
      const { sourceFile, context } = createTsxSource(`<svg className="text-primary fill-current" />`)
      const violations = checkR3(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R4 — More than 1 Primary Action", () => {
    it("warns if more than 1 primary button exists in the same component", () => {
      const { sourceFile, context } = createTsxSource(`
        <div>
          <Button variant="primary">Lưu</Button>
          <Button>Xác nhận</Button>
        </div>
      `)
      const violations = checkR4(sourceFile, context)
      expect(violations.length).toBe(1)
      expect(violations[0]!.message).toContain("Hơn 1 nút chính")
    })

    it("passes with 1 primary and multiple outline buttons", () => {
      const { sourceFile, context } = createTsxSource(`
        <div>
          <Button variant="primary">Lưu</Button>
          <Button variant="outline">Hủy</Button>
        </div>
      `)
      const violations = checkR4(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R5 — Non-interactive element with onClick", () => {
    it("flags clickable div without keyboard access", () => {
      const { sourceFile, context } = createTsxSource(`<div onClick={() => {}}>Bấm vào đây</div>`)
      const violations = checkR5(sourceFile, context)
      expect(violations.length).toBe(1)
      expect(violations[0]!.snippet).toContain("<div onClick=...>")
    })

    it("passes for button type=button", () => {
      const { sourceFile, context } = createTsxSource(`<button type="button" onClick={() => {}}>Bấm</button>`)
      const violations = checkR5(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R6 — Icon-only button without label", () => {
    it("flags button containing only icon without aria-label", () => {
      const { sourceFile, context } = createTsxSource(`<button><TrashIcon size={16} /></button>`)
      const violations = checkR6(sourceFile, context)
      expect(violations.length).toBe(1)
    })

    it("passes if aria-label is provided", () => {
      const { sourceFile, context } = createTsxSource(`<button aria-label="Xóa"><TrashIcon size={16} /></button>`)
      const violations = checkR6(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R7 — Image missing alt", () => {
    it("flags img without alt", () => {
      const { sourceFile, context } = createTsxSource(`<img src="/test.jpg" />`)
      const violations = checkR7(sourceFile, context)
      expect(violations.length).toBe(1)
    })

    it("passes when alt is present", () => {
      const { sourceFile, context } = createTsxSource(`<img src="/test.jpg" alt="Mô tả hoa" />`)
      const violations = checkR7(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R8 — Technical codes in labels", () => {
    it("detects technical code like M01a or SSOT", () => {
      const { sourceFile, context } = createTsxSource(`<div>Nhận diện ảnh M01a theo SSOT</div>`)
      const violations = checkR8(sourceFile, context)
      expect(violations.length).toBeGreaterThanOrEqual(1)
    })

    it("passes with human friendly labels", () => {
      const { sourceFile, context } = createTsxSource(`<div>Nhận diện hoa tự động</div>`)
      const violations = checkR8(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R9 — Bare text Đang tải", () => {
    it("flags bare text Đang tải...", () => {
      const { sourceFile, context } = createTsxSource(`<div>Đang tải…</div>`)
      const violations = checkR9(sourceFile, context)
      expect(violations.length).toBe(1)
    })

    it("passes when using SkeletonBlock", () => {
      const { sourceFile, context } = createTsxSource(`<SkeletonBlock lines={3} />`)
      const violations = checkR9(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R10 — Missing empty / error state with fetch", () => {
    it("flags file with fetch that lacks error handling indicators", () => {
      const { sourceFile, context } = createTsxSource(`
        export function Test() {
          const load = () => fetch("/api/test")
          return <div>Data</div>
        }
      `)
      const violations = checkR10(sourceFile, context)
      expect(violations.length).toBe(1)
    })

    it("passes when InlineError or EmptyState is present", () => {
      const { sourceFile, context } = createTsxSource(`
        export function Test() {
          const load = () => fetch("/api/test").catch(() => {})
          return (
            <div>
              <InlineError message="Lỗi" />
              <EmptyState title="Rỗng" />
            </div>
          )
        }
      `)
      const violations = checkR10(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("R11 — Button without action", () => {
    it("flags standalone button without onClick or submit", () => {
      const { sourceFile, context } = createTsxSource(`<button>Vô nghĩa</button>`)
      const violations = checkR11(sourceFile, context)
      expect(violations.length).toBe(1)
    })

    it("passes when type submit inside form", () => {
      const { sourceFile, context } = createTsxSource(`
        <form>
          <button type="submit">Gửi</button>
        </form>
      `)
      const violations = checkR11(sourceFile, context)
      expect(violations.length).toBe(0)
    })
  })

  describe("Allowlist filtering", () => {
    it("exempts violations matching allowlist entries", () => {
      const violation: Violation = {
        rule: "R1",
        file: "src/components/templates/shared/feature-guidance-card.tsx",
        line: 10,
        column: 5,
        snippet: "bg-red-50",
        message: "Lỗi màu",
      }
      const allowlist = {
        entries: [
          {
            rule: "R1",
            path: "src/components/templates/shared/feature-guidance-card.tsx",
            reason: "K1",
          },
        ],
      }
      expect(isAllowlisted(violation, allowlist)).toBe(true)
    })

    it("does not exempt violations not in allowlist", () => {
      const violation: Violation = {
        rule: "R1",
        file: "src/components/dashboard/sales-workspace.tsx",
        line: 10,
        column: 5,
        snippet: "bg-red-50",
        message: "Lỗi màu",
      }
      const allowlist = {
        entries: [
          {
            rule: "R1",
            path: "src/components/templates/shared/feature-guidance-card.tsx",
            reason: "K1",
          },
        ],
      }
      expect(isAllowlisted(violation, allowlist)).toBe(false)
    })
  })
})
