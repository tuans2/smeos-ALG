import { describe, expect, it } from "vitest"
import {
  buildCustomerOrderSlipText,
  formatCompactVnd,
  formatDayMonth,
} from "@/modules/greeting-card/domain/customer-order-slip"

describe("formatCompactVnd", () => {
  it("viết gọn theo cách tiệm hoa hay ghi", () => {
    expect(formatCompactVnd(330_000)).toBe("330k")
    expect(formatCompactVnd(3_300_000)).toBe("3tr3")
    expect(formatCompactVnd(1_600_000)).toBe("1tr6")
    expect(formatCompactVnd(2_030_000)).toBe("2tr030")
    expect(formatCompactVnd(3_000_000)).toBe("3tr")
    expect(formatCompactVnd(0)).toBe("0đ")
    expect(formatCompactVnd(1_500)).toBe("1.500đ")
  })
})

describe("formatDayMonth", () => {
  it("đổi ngày ISO sang ngày/tháng", () => {
    expect(formatDayMonth("2026-05-25")).toBe("25/5")
    expect(formatDayMonth("2026-05-22T03:00:00.000Z")).toBe("22/5")
    expect(formatDayMonth(null)).toBeNull()
  })
})

describe("buildCustomerOrderSlipText", () => {
  it("dựng phiếu theo mẫu xác nhận đơn, thiếu thiệp thì ghi 'gửi sau'", () => {
    const text = buildCustomerOrderSlipText({
      orderCode: "DH1",
      saleName: "Linh",
      totalVnd: 3_630_000,
      paidVnd: 1_600_000,
      balanceVnd: 2_030_000,
      productName: "Chậu lan",
      flowersSummary: "8 cành lan vàng",
      createdAt: "2026-05-22T01:00:00Z",
      deliveryDate: "2026-05-25",
      deliveryTimeSlot: "8h giao đến",
      deliveryAddress: "69 Hùng Vương",
      recipientName: "Anh A",
      customerName: "Chị B",
    })
    expect(text).toContain("Nhân viên tư vấn: Linh")
    expect(text).toContain("Còn lại: 2tr030")
    expect(text).toContain("Nội dung thiệp: gửi sau")
    expect(text).toContain("Ngày tạo đơn: 22/5")
    expect(text).toContain("Ngày giao hàng: 25/5 (8h giao đến)")
  })

  it("tự tính còn lại khi thiếu balanceVnd", () => {
    expect(buildCustomerOrderSlipText({ totalVnd: 1_000_000, paidVnd: 400_000 })).toContain("Còn lại: 600k")
  })

  it("có VAT thì ghi giá trước thuế + tiền VAT và các ô xuất hoá đơn", () => {
    const text = buildCustomerOrderSlipText({
      totalVnd: 3_630_000, paidVnd: 1_600_000, vatAmountVnd: 330_000, vatRate: 10,
      vatCompanyName: "Cty Đông Nam", vatTaxCode: "0123456789",
    })
    expect(text).toContain("Giá: 3tr3 + 330k xuất hoá đơn (VAT 10%)")
    expect(text).toContain("Còn lại: 2tr030")
    expect(text).toContain("Mã số thuế: 0123456789")
    expect(text).not.toContain("Email nhận hoá đơn")
  })
})

describe("Thẻ Đơn Khách hàng — mã sản phẩm và ghi chú khách", () => {
  it("có mã sản phẩm, nội dung thiệp và ghi chú khách nhập lúc đặt", () => {
    const text = buildCustomerOrderSlipText({
      orderCode: "DH1", productName: "Châu lan", productCode: "BST-034", cardMessage: "Chúc mừng khai trương",
      customerNote: "Gói giấy tông hồng", deliveryNote: "Gọi trước 15 phút",
    })
    expect(text).toContain("Mã sản phẩm: BST-034")
    expect(text).toContain("Nội dung thiệp: Chúc mừng khai trương")
    expect(text).toContain("Ghi chú cho tiệm: Gói giấy tông hồng")
    expect(text).toContain("Ghi chú giao hàng: Gọi trước 15 phút")
  })
})
