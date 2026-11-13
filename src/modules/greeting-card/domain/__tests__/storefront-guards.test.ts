import { describe, expect, it } from "vitest"
import { isLikelyBot, isSameOrder } from "../order-guard"
import { isProductAvailable } from "../product-availability"
import { areaOnly, maskPersonName, phoneLast4Matches } from "../tracking-privacy"

describe("isProductAvailable", () => {
  it("mẫu tạm ngưng hoặc đã lưu trữ không bán trên link khách (checklist ALG 2.3)", () => {
    expect(isProductAvailable({ status: "PAUSED" })).toBe(false)
    expect(isProductAvailable({ status: "ARCHIVED" })).toBe(false)
    expect(isProductAvailable({ status: "ACTIVE" })).toBe(true)
  })

  const row = (status: string, quantity_available: number | null = null) => ({ branch_id: "b1", status, quantity_available })
  it("chưa gắn chi nhánh hoặc chưa khai tồn kho → còn bán", () => {
    expect(isProductAvailable({ branch_id: null, inventory: [row("OUT_OF_STOCK")] })).toBe(true)
    expect(isProductAvailable({ branch_id: "b1", inventory: [] })).toBe(true)
  })
  it("chỉ xét đúng chi nhánh của sản phẩm", () => {
    expect(isProductAvailable({ branch_id: "b1", inventory: [row("OUT_OF_STOCK")] })).toBe(false)
    expect(isProductAvailable({ branch_id: "b2", inventory: [row("OUT_OF_STOCK")] })).toBe(true)
  })
  it("số lượng 0 là hết, trừ khi nhận đặt trước", () => {
    expect(isProductAvailable({ branch_id: "b1", inventory: [row("IN_STOCK", 0)] })).toBe(false)
    expect(isProductAvailable({ branch_id: "b1", inventory: [row("PRE_ORDER_ONLY", 0)] })).toBe(true)
    expect(isProductAvailable({ branch_id: "b1", inventory: [row("IN_STOCK", 3)] })).toBe(true)
  })
})

describe("order-guard", () => {
  it("ô bẫy có chữ → máy", () => {
    expect(isLikelyBot("x")).toBe(true)
    expect(isLikelyBot("  ")).toBe(false)
    expect(isLikelyBot(undefined)).toBe(false)
  })
  it("cùng người nhận + cùng ngày giao mới là đơn trùng", () => {
    expect(isSameOrder({ recipientPhone: "0912", deliveryDate: "2026-10-10" }, { recipientPhone: "0912", deliveryDate: "2026-10-10" })).toBe(true)
    expect(isSameOrder({ recipientPhone: "0912", deliveryDate: "2026-10-10" }, { recipientPhone: "0912", deliveryDate: "2026-10-11" })).toBe(false)
  })
})

describe("tracking-privacy", () => {
  it("viết tắt họ/đệm, giữ tên gọi", () => {
    expect(maskPersonName("Nguyễn Văn An")).toBe("N. V. An")
    expect(maskPersonName("An")).toBe("An")
    expect(maskPersonName("")).toBe("Khách nhận")
  })
  it("chỉ phường + tỉnh", () => {
    expect(areaOnly({ parts: { ward: "Phường Bến Thành", province: "TP. Hồ Chí Minh" }, street: "45 Lê Lợi, Phường Bến Thành, TP. Hồ Chí Minh" })).toBe("Phường Bến Thành, TP. Hồ Chí Minh")
    expect(areaOnly({ street: "45 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM" })).toBe("Quận 1, TP.HCM")
    expect(areaOnly({ street: "45 Lê Lợi" })).toBe("")
  })
  it("4 số cuối SĐT", () => {
    expect(phoneLast4Matches("0987 654 321", "4321")).toBe(true)
    expect(phoneLast4Matches("0987654321", "1234")).toBe(false)
    expect(phoneLast4Matches("0987654321", "43a1")).toBe(false)
    expect(phoneLast4Matches(null, "4321")).toBe(false)
  })
})
