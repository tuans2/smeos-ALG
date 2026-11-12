import { describe, expect, it } from "vitest"
import { compareWithBaseline, isScannable, scanContent } from "./handover-content-rules.mjs"
import { findHandoverViolations, LOCAL_PATH } from "./handover-rules.mjs"

type Violation = { rule: string; path: string }
const check = (entries: string[], withLocalPath: string[] = [], recipient?: string) =>
  (findHandoverViolations(entries, withLocalPath, { recipient }) as Violation[]).map((v) => `${v.rule}: ${v.path}`)

describe("handover-rules — luật kiểm bản giao khách", () => {
  it("chặn cấu hình agent ở gốc repo", () => {
    expect(check(["CLAUDE.md", "AGENTS.md", ".claude/settings.json", ".agents/AGENT_RULES.md", "README.md"])).toEqual([
      "cấu hình agent: CLAUDE.md",
      "cấu hình agent: AGENTS.md",
      "cấu hình agent: .claude/settings.json",
      "cấu hình agent: .agents/AGENT_RULES.md",
    ])
  })

  it("chặn tài liệu hướng dẫn agent trong docs/", () => {
    expect(
      check([
        "docs/governance/sdagf/AI_AGENT_MASTER_PROMPT.md",
        "docs/archive/historical/kit/08_AGENT_EXECUTION_PROTOCOL.md",
        "docs/archive/guides/M01_VISION_CODING_AGENT_GUIDE.md",
        "docs/agent-overview.md",
      ]),
    ).toHaveLength(3)
  })

  it("chặn tệp văn phòng mang tên khách hàng khác, không chặn mẫu chung", () => {
    expect(
      check([
        "docs/Nhập liệu/BST_Basic_NhuCauDN_Chuan_ALG.xlsx",
        "docs/Nhập liệu/Kho_San_Pham_ALG_Template.xlsx",
        "docs/khach/Bao_gia_Avi_Florist.docx",
        "docs/Nhập liệu/ALG_Template_Master_Kho_San_Pham.xlsx",
        "public/templates/ALG_Template_Master_Kho_San_Pham.xlsx",
        "src/modules/catalog/algorithm.ts",
      ]),
    ).toEqual([
      "tệp của khách hàng khác: docs/Nhập liệu/BST_Basic_NhuCauDN_Chuan_ALG.xlsx",
      "tệp của khách hàng khác: docs/Nhập liệu/Kho_San_Pham_ALG_Template.xlsx",
      "tệp của khách hàng khác: docs/khach/Bao_gia_Avi_Florist.docx",
    ])
  })

  it("chặn tệp có đường dẫn máy cá nhân chỉ khi tệp nằm trong bản giao", () => {
    expect(LOCAL_PATH.startsWith("file://")).toBe(true)
    expect(check(["docs/a.md"], ["docs/a.md", "CLAUDE.md"])).toEqual(["đường dẫn máy cá nhân: docs/a.md"])
  })

  it("bản giao sạch thì không có vi phạm", () => {
    expect(check(["README.md", "LICENSE", "src/app/page.tsx"])).toEqual([])
  })

  it("bàn giao cho ALG: tệp mang tên ALG không còn là của khách khác, tên bên khác vẫn bị chặn", () => {
    expect(
      check(["docs/Nhập liệu/Kho_San_Pham_ALG_Template.xlsx", "docs/khach/Bao_gia_SIIN.xlsx", "docs/x/Don_Moc_Lan.pdf"], [], "ALG"),
    ).toEqual(["tệp của khách hàng khác: docs/khach/Bao_gia_SIIN.xlsx", "tệp của khách hàng khác: docs/x/Don_Moc_Lan.pdf"])
  })
})

describe("handover-content-rules — quét nội dung bản cắt (kế hoạch GD1, Bước 2.4)", () => {
  const rules = (text: string) =>
    (scanContent("a.ts", text) as { rule: string; count: number }[]).map((f) => `${f.rule}:${f.count}`)

  it("bắt tên bên khác, số điện thoại, email thật, mật khẩu viết cứng, đường dẫn máy cá nhân", () => {
    expect(rules("Tiệm SiiN Store và Mộc Lan")).toEqual(["tên bên khác:2"])
    expect(rules('const sdt = "0912345678"; const qt = "+84987654321"')).toEqual(["số điện thoại:2"])
    expect(rules('to: "chu.tiem@gmail.com"')).toEqual(["email:1"])
    expect(rules('password: "MatKhau123"')).toEqual(["mật khẩu viết cứng:1"])
    expect(rules('const p = "/Users/ai/Desktop/x.png"; const q = "/home/an/du-an"')).toEqual(["đường dẫn máy cá nhân:2"])
  })

  it("không bắt địa chỉ ví dụ, mã đơn dài, đường dẫn máy chạy CI", () => {
    expect(rules('a@example.com b@shop.test c@x.invalid')).toEqual([])
    expect(rules('const code = "DH20261109123456"; const id = 10912345678')).toEqual([])
    expect(rules('cd /home/user/app && cd /home/runner/work')).toEqual([])
  })

  it("chỉ quét tệp văn bản, bỏ package-lock", () => {
    expect(isScannable("src/a.tsx")).toBe(true)
    expect(isScannable(".env.example")).toBe(true)
    expect(isScannable("package-lock.json")).toBe(false)
    expect(isScannable("public/logo.png")).toBe(false)
  })

  it("baseline: phát hiện cũ cho qua, tăng hoặc mới thì đỏ, giảm thì nhắc hạ mốc", () => {
    const baseline = { "email|a.ts": 2, "email|b.ts": 1 }
    const { fresh, stale } = compareWithBaseline(
      [
        { rule: "email", path: "a.ts", count: 3 },
        { rule: "email", path: "c.ts", count: 1 },
      ],
      baseline,
    )
    expect(fresh.map((f: { path: string }) => f.path)).toEqual(["a.ts", "c.ts"])
    expect(stale).toEqual(["email|b.ts"])
  })
})
