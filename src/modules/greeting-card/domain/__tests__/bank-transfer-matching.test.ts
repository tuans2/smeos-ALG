import { describe, it, expect } from "vitest"
import { decideTransfer, extractOrderCode } from "../bank-transfer-matching"

describe("extractOrderCode", () => {
  it("nhận mã dù mất dấu gạch, viết thường, có tiền tố ngân hàng", () => {
    expect(extractOrderCode("DH261005-R8H15TGW")).toBe("DH261005-R8H15TGW")
    expect(extractOrderCode("MBVCB.3278907687.dh261005r8h15tgw.CT tu 0123")).toBe("DH261005-R8H15TGW")
    expect(extractOrderCode("thanh toan DH 261005 R8H15TGW cam on")).toBe("DH261005-R8H15TGW")
  })
  it("không khớp chuỗi ngắn/dài sai", () => {
    expect(extractOrderCode("chuyen tien mua hoa")).toBeNull()
    expect(extractOrderCode("DH261005-R8H15TG")).toBeNull()
    expect(extractOrderCode("DH261005-R8H15TGWX")).toBeNull()
  })
})

describe("decideTransfer", () => {
  it("ghi đúng số tiền, cắt phần chuyển thừa, đẩy đơn huỷ/đã thu đủ sang chờ xử lý tay", () => {
    expect(decideTransfer({ status: "DRAFT", totalVnd: 500, paidVnd: 0 }, 300)).toEqual({ kind: "RECORD", amountVnd: 300, note: null })
    expect(decideTransfer({ status: "DRAFT", totalVnd: 500, paidVnd: 0 }, 800)).toMatchObject({ kind: "RECORD", amountVnd: 500 })
    expect(decideTransfer({ status: "CANCELLED", totalVnd: 500, paidVnd: 0 }, 500).kind).toBe("UNMATCHED")
    expect(decideTransfer({ status: "CONFIRMED", totalVnd: 500, paidVnd: 500 }, 500).kind).toBe("UNMATCHED")
    expect(decideTransfer(null, 500).kind).toBe("UNMATCHED")
  })
})
