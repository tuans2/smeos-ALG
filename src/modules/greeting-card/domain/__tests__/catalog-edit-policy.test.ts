import { describe, it, expect } from "vitest"
import { canEditAnyCatalog, canEditCatalog } from "../catalog-edit-policy"

const has = (codes: string[]) => (c: string) => codes.includes(c)
const SALE = ["L1", "R1", "R2", "R9"]

/** PO 16/10/2026: Sale và Điều phối sửa bộ sưu tập của mình, không đụng bộ sưu tập người khác; chỉ L4 (Điều hành) sửa mọi bộ sưu tập. */
describe("catalog-edit-policy", () => {
  it("Sale sửa được bộ sưu tập do chính mình tạo, không sửa của người khác", () => {
    expect(canEditCatalog({ createdBy: "lan" }, { userId: "lan", has: has(SALE) })).toBe(true)
    expect(canEditCatalog({ createdBy: "chu-tiem" }, { userId: "lan", has: has(SALE) })).toBe(false)
  })

  it("Điều phối (có L3) như Sale: chỉ sửa bộ sưu tập của mình; L4 (Điều hành) sửa được mọi bộ sưu tập", () => {
    const COORDINATOR = [...SALE, "L2", "L3", "R3", "R4", "R5"]
    expect(canEditCatalog({ createdBy: "lan" }, { userId: "hung", has: has(COORDINATOR) })).toBe(false)
    expect(canEditCatalog({ createdBy: "hung" }, { userId: "hung", has: has(COORDINATOR) })).toBe(true)
    expect(canEditCatalog({ createdBy: "lan" }, { userId: "x", has: has(["L4"]) })).toBe(true)
  })

  it("chưa biết người xem / người tạo → không sửa (trừ L4); cài đặt chung chỉ L4", () => {
    expect(canEditCatalog({ createdBy: null }, { userId: null, has: has(SALE) })).toBe(false)
    expect(canEditCatalog({ createdBy: undefined }, { userId: undefined, has: has(SALE) })).toBe(false)
    expect(canEditAnyCatalog(has(SALE))).toBe(false)
    expect(canEditAnyCatalog(has(["L3"]))).toBe(false)
    expect(canEditAnyCatalog(has(["L4"]))).toBe(true)
  })
})
