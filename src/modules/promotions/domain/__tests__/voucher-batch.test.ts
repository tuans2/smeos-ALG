import { describe, expect, it } from "vitest"

import {
  CODE_ALPHABET,
  csvCell,
  discountLabel,
  generateCodes,
  randomCode,
  validateVoucherBatch,
  voucherBatchStatus,
  type VoucherBatchInput,
} from "../voucher-batch"

const input = (over: Partial<VoucherBatchInput> = {}): VoucherBatchInput => ({
  name: "Tri ân Tết", mode: "SHARED", sharedCode: "TET2027", codePrefix: null, quantity: 1, promotionId: null,
  discountType: "PERCENTAGE", discountValue: 10, minOrderVnd: 0, maxDiscountVnd: null,
  startsAt: null, expiresAt: null, usageLimit: null, perCustomerLimit: 1, ...over,
})
const policy = { maxDiscountPercent: 50 as number | null, activePromotionIds: new Set(["promo-discount-10"]) }

describe("kiểm đợt phát hành mã giảm giá", () => {
  it("đợt hợp lệ không có lỗi", () => {
    expect(validateVoucherBatch(input(), policy)).toEqual({})
    expect(validateVoucherBatch(input({ mode: "UNIQUE", sharedCode: null, quantity: 200, codePrefix: "trian" }), policy)).toEqual({})
  })

  it("trần % theo khoá nền tảng của ma trận ưu đãi", () => {
    expect(validateVoucherBatch(input({ discountValue: 60 }), policy).discountValue).toMatch(/50%/)
    expect(validateVoucherBatch(input({ discountValue: 60 }), { ...policy, maxDiscountPercent: null })).toEqual({})
  })

  it("chỉ gắn được ưu đãi đang bật", () => {
    expect(validateVoucherBatch(input({ promotionId: "promo-da-tat" }), policy).promotionId).toBeDefined()
    expect(validateVoucherBatch(input({ promotionId: "promo-discount-10" }), policy)).toEqual({})
  })

  it("chặn mã sai dạng, số lượng vượt trần, ngày ngược, lượt khách lớn hơn tổng lượt", () => {
    expect(validateVoucherBatch(input({ sharedCode: "mã có dấu" }), policy).sharedCode).toBeDefined()
    expect(validateVoucherBatch(input({ mode: "UNIQUE", quantity: 1001 }), policy).quantity).toBeDefined()
    expect(validateVoucherBatch(input({ startsAt: new Date("2026-12-01"), expiresAt: new Date("2026-11-01") }), policy).expiresAt).toBeDefined()
    expect(validateVoucherBatch(input({ usageLimit: 1, perCustomerLimit: 2 }), policy).perCustomerLimit).toBeDefined()
    expect(validateVoucherBatch(input({ discountType: "FIXED_AMOUNT", discountValue: 10.5 }), policy).discountValue).toBeDefined()
  })
})

describe("sinh mã", () => {
  it("mã ngẫu nhiên chỉ dùng ký tự dễ đọc, có tiền tố", () => {
    const code = randomCode("tri", () => 0.5)
    expect(code).toMatch(/^TRI-[A-Z2-9]{8}$/)
    expect([...code.slice(4)].every((c) => CODE_ALPHABET.includes(c))).toBe(true)
  })

  it("không trùng nhau và không trùng mã đã có", () => {
    let seed = 1
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const taken = new Set([randomCode(null, (() => { let s = 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647) })())])
    const codes = generateCodes(null, 300, taken, random)
    expect(codes).toHaveLength(300)
    expect(new Set(codes).size).toBe(300)
    expect(codes.some((c) => taken.has(c))).toBe(false)
  })

  it("nguồn ngẫu nhiên hỏng không treo vòng lặp", () => {
    expect(generateCodes(null, 5, new Set(), () => 0)).toHaveLength(1)
  })
})

describe("trạng thái và hiển thị", () => {
  const now = new Date("2026-10-30T00:00:00Z")
  const base = { isActive: true, startsAt: null, expiresAt: null, codeCount: 10, exhaustedCount: 0 }
  it("tạm dừng > hết hạn > chưa đến ngày > dùng hết > đang dùng", () => {
    expect(voucherBatchStatus({ ...base, isActive: false }, now)).toBe("PAUSED")
    expect(voucherBatchStatus({ ...base, expiresAt: new Date("2026-10-01") }, now)).toBe("EXPIRED")
    expect(voucherBatchStatus({ ...base, startsAt: new Date("2026-11-01") }, now)).toBe("SCHEDULED")
    expect(voucherBatchStatus({ ...base, exhaustedCount: 10 }, now)).toBe("EXHAUSTED")
    expect(voucherBatchStatus(base, now)).toBe("ACTIVE")
  })

  it("nhãn mức giảm và ô CSV chống công thức", () => {
    expect(discountLabel("FIXED_AMOUNT", 30000, null)).toBe("Giảm 30.000 ₫")
    expect(discountLabel("PERCENTAGE", 10, 50000)).toBe("Giảm 10% (tối đa 50.000 ₫)")
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`)
    expect(csvCell('a"b')).toBe(`"a""b"`)
  })
})
