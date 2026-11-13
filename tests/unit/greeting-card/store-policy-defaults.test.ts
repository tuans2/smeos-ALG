import { describe, expect, it } from "vitest"
import {
  DEFAULT_AGREEMENTS,
  DEFAULT_COMMITMENTS,
  parseStorePolicies,
  resolveAppliedPolicies,
} from "@/modules/greeting-card/domain/store-policy"

describe("Bộ Cam kết & Thỏa thuận mặc định (PO 08/10/2026)", () => {
  it("đủ 6 cam kết, 7 thỏa thuận, id không trùng", () => {
    expect(DEFAULT_COMMITMENTS).toHaveLength(6)
    expect(DEFAULT_AGREEMENTS).toHaveLength(7)
    const ids = [...DEFAULT_COMMITMENTS, ...DEFAULT_AGREEMENTS].map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(DEFAULT_AGREEMENTS.map((a) => a.id)).toContain("agree-order-change")
    expect(DEFAULT_AGREEMENTS.map((a) => a.id)).not.toContain("agree-seasonal")
  })

  it("tiêu đề không tự đánh số — trang đặt hàng đã có dấu ✓/• và số lượng", () => {
    for (const item of [...DEFAULT_COMMITMENTS, ...DEFAULT_AGREEMENTS]) {
      expect(item.title).not.toMatch(/^\d/)
      expect(item.customerText.trim().length).toBeGreaterThan(0)
    }
  })

  it("tiệm chưa lưu chính sách riêng → khách thấy bộ mặc định mới", () => {
    const applied = resolveAppliedPolicies({}, {})
    expect(applied.commitments.map((c) => c.title)).toEqual(DEFAULT_COMMITMENTS.map((c) => c.title))
    expect(applied.agreements.map((a) => a.title)).toEqual(DEFAULT_AGREEMENTS.map((a) => a.title))
  })

  it("tiệm đã tự sửa → giữ nguyên nội dung của tiệm, không bị mặc định ghi đè", () => {
    const own = { id: "agree-substitute-flowers", title: "Thay hoa phụ", customerText: "Nội dung riêng của tiệm." }
    const parsed = parseStorePolicies({ store_policies: { agreements: [own] } })
    expect(parsed.agreements).toEqual([own])
    expect(parsed.commitments).toEqual(DEFAULT_COMMITMENTS)
  })
})
