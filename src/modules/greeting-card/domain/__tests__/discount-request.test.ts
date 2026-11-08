import { describe, expect, it } from "vitest"
import { discountError, discountVndOf, manualDiscountRoomVnd, parseMaxDiscountPercent, priorDiscountsOf } from "../discount-request"

describe("discount-request", () => {
  // PO 07/11/2026: một trần duy nhất — mặc định và tối đa = trần nền tảng 50%
  it("mức tối đa mặc định 50% (trần nền tảng), Điều hành đặt thấp hơn được, cao hơn bị kẹp về 50%", () => {
    expect(parseMaxDiscountPercent({})).toBe(50)
    expect(parseMaxDiscountPercent({ brochure_discount: { max_percent: 10 } })).toBe(10)
    expect(parseMaxDiscountPercent({ brochure_discount: { max_percent: 80 } })).toBe(50)
    expect(parseMaxDiscountPercent({ brochure_discount: { max_percent: 150 } })).toBe(50)
  })

  it("tính tiền giảm theo % (làm tròn xuống nghìn) hoặc theo số tiền", () => {
    expect(discountVndOf({ percent: 10 }, 1_255_000)).toBe(125_000)
    expect(discountVndOf({ amountVnd: 50_000 }, 1_000_000)).toBe(50_000)
  })

  it("chặn vượt trần, chưa có giá, nhập cả hai/không nhập gì", () => {
    expect(discountError({ percent: 25 }, 1_000_000, 25)).toBeNull()
    expect(discountError({ percent: 30 }, 1_000_000, 25)).toContain("Vượt mức giảm tối đa 25%")
    expect(discountError({ amountVnd: 300_000 }, 1_000_000, 25)).toContain("Vượt mức")
    expect(discountError({ percent: 5 }, 0, 25)).toContain("chưa có giá")
    expect(discountError({ percent: 5, amountVnd: 1 }, 1_000_000, 25)).toContain("% hoặc theo số tiền")
    expect(discountError({}, 1_000_000, 25)).toContain("% hoặc theo số tiền")
  })

  // PO 07/11/2026: giảm tay của Điều hành vào trần chung — cộng mã giảm giá, hạng khách, ưu đãi đã áp ≤ 50% tiền hàng
  describe("trần chung với các khoản giảm đã áp", () => {
    const ref = { subtotalVnd: 1_000_000, discountVnd: 300_000, tierDiscountVnd: 50_000, promotionDiscountVnd: 0, shippingFeeVnd: 30_000, totalVnd: 680_000 }

    it("đọc khoản giảm từ bản chụp báo giá; đơn chờ báo giá không có gốc tiền hàng", () => {
      expect(priorDiscountsOf(ref)).toEqual({ goodsVnd: 1_000_000, priorVnd: 350_000 })
      expect(priorDiscountsOf({ awaitingQuote: false, subtotalVnd: 0, quotedTotalVnd: 900_000 })).toEqual({ goodsVnd: null, priorVnd: 0 })
      expect(priorDiscountsOf(null)).toEqual({ goodsVnd: null, priorVnd: 0 })
    })

    it("còn giảm thêm = 50% tiền hàng trừ phần đã giảm; đơn chờ báo giá lấy giá đơn làm gốc", () => {
      expect(manualDiscountRoomVnd(priorDiscountsOf(ref), 680_000)).toBe(150_000)
      expect(manualDiscountRoomVnd({ goodsVnd: null, priorVnd: 0 }, 900_000)).toBe(450_000)
      expect(manualDiscountRoomVnd({ goodsVnd: 1_000_000, priorVnd: 600_000 }, 400_000)).toBe(0)
    })

    it("giảm tay vượt phần còn lại → lỗi nêu số đã giảm và số còn giảm được; trong trần → hợp lệ", () => {
      const prior = priorDiscountsOf(ref)
      expect(discountError({ amountVnd: 150_000 }, 680_000, 50, prior)).toBeNull()
      const err = discountError({ amountVnd: 160_000 }, 680_000, 50, prior)
      expect(err).toContain("trần 50% tiền hàng")
      expect(err).toContain("350.000đ")
      expect(err).toContain("150.000đ")
      expect(err).not.toMatch(/[A-Z_]{4,}/)
    })
  })
})
