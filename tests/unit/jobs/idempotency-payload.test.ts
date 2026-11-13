import { describe, expect, it } from "vitest"

import { samePayload } from "@/modules/jobs/domain/idempotency"

/** Audit API-11 (PO 07/11/2026): cùng `Idempotency-Key` mà khác thân → `enqueueJob` ghi cảnh báo. */
describe("samePayload", () => {
  it("không phụ thuộc thứ tự khoá (Postgres jsonb tự sắp lại) và bỏ undefined như JSON", () => {
    expect(samePayload({ b: 1, a: { y: [1, { q: 2, p: 1 }], x: "z" } }, { a: { x: "z", y: [1, { p: 1, q: 2 }] }, b: 1 })).toBe(true)
    expect(samePayload({ a: 1, b: undefined }, { a: 1 })).toBe(true)
    expect(samePayload(null, undefined)).toBe(true)
  })

  it("khác giá trị, khác thứ tự mảng, thêm khoá → khác", () => {
    expect(samePayload({ a: 1 }, { a: 2 })).toBe(false)
    expect(samePayload({ a: [1, 2] }, { a: [2, 1] })).toBe(false)
    expect(samePayload({ a: 1 }, { a: 1, b: null })).toBe(false)
    expect(samePayload({ page: "trang-chu" }, "trang-chu")).toBe(false)
  })
})
