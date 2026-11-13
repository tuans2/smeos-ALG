import { describe, it, expect } from "vitest"
import { getDictionary, translate, interpolate } from "../server"
import { formatCurrency, formatDate, formatTime, formatDateTime, formatNumber } from "../formatters"
import { viDictionary } from "../locales/vi"
import { enDictionary } from "../locales/en"

describe("i18n Engine — Động cơ đa ngôn ngữ & SSOT từ điển", () => {
  it("trả về từ điển tiếng Việt gốc mặc định", () => {
    const dict = getDictionary("vi")
    expect(dict.common.terms.shop).toBeDefined()
    expect(dict.home.header.badge).toBeDefined()
    expect(dict.orders.header.title).toBeDefined()
  })

  it("trả về từ điển tiếng Anh khi yêu cầu locale 'en'", () => {
    const dict = getDictionary("en")
    expect(dict.common.terms.shop).toBe("Flower Shop")
    expect(dict.home.header.badge).toBe("Quick Start")
    expect(dict.orders.header.title).toBe("Orders")
  })

  it("dịch đúng qua hàm translate với dot-notation key", () => {
    expect(translate("vi", "common.actions.confirm")).toBe("Xác nhận")
    expect(translate("en", "common.actions.confirm")).toBe("Confirm")
    expect(translate("vi", "orders.tabs.allOrders")).toBe("Tất cả đơn hàng")
    expect(translate("en", "orders.tabs.allOrders")).toBe("All Orders")
  })

  it("nội suy chính xác các tham số biến trong chuỗi", () => {
    const template = "Hiển thị {from} - {to} trên tổng số {total}"
    const result = interpolate(template, { from: 1, to: 20, total: 100 })
    expect(result).toBe("Hiển thị 1 - 20 trên tổng số 100")

    const translatedWithParams = translate("vi", "home.filters.emptySearch", { query: "hoa sen" })
    expect(translatedWithParams).toBe("Không có kết quả cho “hoa sen”. Hãy thử từ khóa khác.")
  })

  it("giữ nguyên token {variable} nếu không truyền tham số", () => {
    const template = "Chào {name}"
    expect(interpolate(template)).toBe("Chào {name}")
  })

  it("đối chiếu cấu trúc tương đồng giữa viDictionary và enDictionary", () => {
    const viKeys = Object.keys(viDictionary)
    const enKeys = Object.keys(enDictionary)
    expect(enKeys).toEqual(viKeys)
  })

  it("định dạng tiền tệ chuẩn xác qua formatCurrency", () => {
    expect(formatCurrency(150000, "vi")).toBe("150.000 ₫")
    expect(formatCurrency(150000, "en")).toContain("150,000")
    expect(formatCurrency(0, "vi")).toBe("0 ₫")
  })

  it("định dạng số lượng phân cách hàng ngàn chuẩn xác qua formatNumber", () => {
    expect(formatNumber(1250000, "vi")).toBe("1.250.000")
    expect(formatNumber(1250000, "en")).toBe("1,250,000")
  })

  it("định dạng ngày giờ chuẩn xác qua formatDate và formatDateTime", () => {
    const testDate = new Date("2026-10-28T10:30:00Z")
    expect(formatDate(testDate, "vi")).toBe("28/10/2026")
    expect(formatDate(testDate, "en")).toBe("10/28/2026")
    expect(formatDateTime(testDate, "vi")).toContain("28/10/2026")
  })
})

describe("Câu chữ Journey-First của trang chủ", () => {
  it("tiêu đề trang chủ chủ tiệm vẫn là câu hỏi 'Bạn muốn làm gì?' (đổi văn phong không được làm mất)", () => {
    expect(viDictionary.toolkit.header.titleProd).toMatch(/bạn muốn làm gì/i)
    expect(viDictionary.home.tiers.store.title).toMatch(/bạn muốn làm gì/i)
    expect(viDictionary.home.tiers.chain.title).toMatch(/bạn muốn làm gì/i)
  })
})
