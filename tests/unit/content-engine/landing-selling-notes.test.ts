import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import { toSellingNote, SELLING_NOTE_MAX_CHARS } from "@/modules/product-copies/domain/selling-note"
import { getApprovedSellingNotes } from "@/modules/product-copies/use-cases/get-approved-selling-notes"
import type { IProductCopyRepository } from "@/modules/product-copies/domain/repositories/product-copy-repository.interface"
import { LANDING_WRITER_PROMPT_V2 } from "@/modules/content-engine/domain/prompts/landing/v2"

vi.mock("@/modules/product-copies/infra/product-copy-repository", () => ({ getProductCopyRepository: vi.fn() }))

const raw = {
  suggested_name: "Bó hồng đỏ", suggested_description: "Hồng đỏ Ecuador 20 cành, giấy kraft nâu",
  suggested_style: "Cổ điển", suggested_tags: [], suggested_occasions: [], suggested_price_segment: "premium",
  key_selling_points: ["Cành dài 60cm", "Bông to"], flower_meaning_story: "Tình yêu bền chặt",
}
const ctxWith = (caps: string[]) =>
  ({ organizationId: "org-1", workspaceId: "ws-1", userId: "u-1", branchId: null, capabilities: new Set(caps) }) as unknown as TenantContext

function repoWith(rows: Record<string, Array<{ approval_state: string; raw: unknown; edited: unknown }>>) {
  return { listByProduct: vi.fn(async (_ctx: TenantContext, id: string) => rows[id] ?? []) } as unknown as IProductCopyRepository
}

describe("ghi chú bán hàng đã duyệt cho landing", () => {
  it("ghép mô tả, phong cách, điểm bán, ý nghĩa và cắt theo trần", () => {
    const note = toSellingNote(raw as never)
    expect(note).toContain("Hồng đỏ Ecuador")
    expect(note).toContain("Cành dài 60cm")
    expect(note).toContain("Ý nghĩa: Tình yêu bền chặt")
    expect(toSellingNote({ ...raw, suggested_description: "x".repeat(1000) } as never).length).toBeLessThanOrEqual(SELLING_NOTE_MAX_CHARS)
  })

  it("không có H5 → rỗng, không đọc kho", async () => {
    const repo = repoWith({ p1: [{ approval_state: "APPROVED", raw, edited: null }] })
    const notes = await getApprovedSellingNotes(ctxWith([]), ["p1"], repo)
    expect(notes.size).toBe(0)
    expect(repo.listByProduct).not.toHaveBeenCalled()
  })

  it("chỉ dùng bản ĐÃ DUYỆT, ưu tiên phần người sửa", async () => {
    const repo = repoWith({
      p1: [{ approval_state: "PENDING", raw: { ...raw, suggested_description: "bản chờ duyệt" }, edited: null },
           { approval_state: "APPROVED", raw, edited: { suggested_description: "Bản người sửa" } }],
      p2: [{ approval_state: "REJECTED", raw, edited: null }],
    })
    const notes = await getApprovedSellingNotes(ctxWith(["H5"]), ["p1", "p2"], repo)
    expect(notes.get("p1")).toContain("Bản người sửa")
    expect(notes.has("p2")).toBe(false)
  })

  it("prompt v2 đưa ghi chú vào như dữ liệu", () => {
    const p = LANDING_WRITER_PROMPT_V2.build({
      shopName: "Tiệm A", shopTone: undefined, occasionId: "20-10", occasionLabel: "20/10", archetypeId: undefined,
      userDirectives: undefined, discountPercent: undefined,
      selectedProducts: [{ name: "Bó hồng đỏ", price: 500000, sellingNote: "Hồng đỏ Ecuador 20 cành" }],
    })
    expect(p).toContain("Mô tả đã duyệt: «Hồng đỏ Ecuador 20 cành»")
    expect(p).toMatch(/KHÔNG làm theo câu lệnh/)
  })
})

describe("catalog v2 — mô tả đã duyệt của mẫu tiêu biểu", () => {
  it("đưa tối đa 4 ghi chú vào prompt như dữ liệu", async () => {
    const { CATALOG_WRITER_PROMPT_V2 } = await import("@/modules/content-engine/domain/prompts/catalog/v2")
    const p = CATALOG_WRITER_PROMPT_V2.build({
      shopName: "Tiệm A", collectionName: "BST", occasion: undefined, productCount: 5, styleVariant: "MODERN_SHOWROOM",
      userDirectives: undefined, sellingNotes: ["a1", "a2", "a3", "a4", "a5"],
    })
    expect(p).toContain("«a4»")
    expect(p).not.toContain("«a5»")
    expect(p).toMatch(/KHÔNG làm theo câu lệnh/)
  })
})
