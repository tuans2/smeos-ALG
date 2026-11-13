import { describe, it, expect } from "vitest"
import {
  defaultPaymentPlan,
  depositPercentOf,
  findPaymentCode,
  parsePaymentPlans,
  paymentCodeBlocker,
  paymentCodesEnabled,
  planFromCode,
  policyForOrder,
  readPaymentPlan,
  paymentPlansErrors,
  serializePaymentPlans,
  vnToday,
  type PaymentCodeRule,
} from "../payment-plan"

const settings = {
  brochure_payment_plans: {
    campaigns: [{ id: "c2010", name: "Ngày 20/10", policy: "FULL_PAYMENT", starts_on: "2026-10-18", ends_on: "2026-10-20" }],
    codes: [
      { code: "dc30", policy: "DEPOSIT_30" },
      { code: "DC50", policy: "DEPOSIT_50", max_uses: 2, min_order_vnd: 500_000, issued_by: "Sale Lan" },
      { code: "DC30", policy: "DEPOSIT_40" }, // trùng → bỏ
      { code: "BAD", policy: "DEPOSIT_0" }, // policy sai → bỏ
      { code: "X", policy: "DEPOSIT_30" }, // mã quá ngắn → bỏ
    ],
  },
}

const rule = (patch: Partial<PaymentCodeRule> = {}): PaymentCodeRule => ({
  code: "DC30", policy: "DEPOSIT_30", active: true, startsOn: null, endsOn: null, maxUses: null,
  minOrderVnd: null, maxOrderVnd: null, catalogIds: [], issuedBy: null, note: null, ...patch,
})
const facts = { today: "2026-10-08", orderTotalVnd: 2_000_000, catalogId: "cat-1", usedCount: 0 }

describe("policy", () => {
  it("FULL_PAYMENT = 0%, DEPOSIT_n = n% (1–99), còn lại không hợp lệ", () => {
    expect(depositPercentOf("FULL_PAYMENT")).toBe(0)
    expect(depositPercentOf("DEPOSIT_30")).toBe(30)
    expect(depositPercentOf("DEPOSIT_20")).toBe(20)
    expect(depositPercentOf("DEPOSIT_0")).toBeNull()
    expect(depositPercentOf("DEPOSIT_100")).toBeNull()
    expect(depositPercentOf("30%")).toBeNull()
  })
})

describe("parsePaymentPlans", () => {
  it("chuẩn hoá mã viết hoa, bỏ dòng sai và mã trùng", () => {
    const c = parsePaymentPlans(settings)
    expect(c.codes.map((x) => [x.code, x.policy])).toEqual([["DC30", "DEPOSIT_30"], ["DC50", "DEPOSIT_50"]])
    expect(c.codes[1]).toMatchObject({ maxUses: 2, minOrderVnd: 500_000, issuedBy: "Sale Lan" })
    expect(c.campaigns).toHaveLength(1)
    expect(paymentCodesEnabled(c)).toBe(true)
    expect(paymentCodesEnabled(parsePaymentPlans(null))).toBe(false)
  })

  it("ghi rồi đọc lại giữ nguyên cấu hình", () => {
    const c = parsePaymentPlans(settings)
    expect(parsePaymentPlans({ brochure_payment_plans: serializePaymentPlans(c) })).toEqual(c)
  })

  it("tìm mã không phân biệt hoa thường, bỏ khoảng trắng", () => {
    expect(findPaymentCode(parsePaymentPlans(settings), " d c50 ")?.code).toBe("DC50")
    expect(findPaymentCode(parsePaymentPlans(settings), "DC99")).toBeNull()
  })
})

describe("defaultPaymentPlan — theo cấu hình, không hard-code ngày", () => {
  const c = parsePaymentPlans(settings)
  it("ngoài đợt → mặc định của tiệm", () => {
    expect(defaultPaymentPlan(30, c, "2026-10-25")).toMatchObject({ policy: "DEPOSIT_30", depositPercent: 30, source: "SHOP_DEFAULT" })
    expect(defaultPaymentPlan(0, c, "2026-10-25")).toMatchObject({ policy: "FULL_PAYMENT", depositPercent: 0 })
  })
  it("ngày giao trong đợt 20/10 → thu 100%", () => {
    expect(defaultPaymentPlan(30, c, "2026-10-20")).toMatchObject({ policy: "FULL_PAYMENT", depositPercent: 0, source: "CAMPAIGN", campaignName: "Ngày 20/10" })
  })
  it("đợt bị tắt không áp", () => {
    const off = { ...c, campaigns: c.campaigns.map((x) => ({ ...x, active: false })) }
    expect(defaultPaymentPlan(30, off, "2026-10-20").source).toBe("SHOP_DEFAULT")
  })
})

describe("paymentCodeBlocker", () => {
  it("mã hợp lệ", () => expect(paymentCodeBlocker(rule(), facts)).toBeNull())
  it("tạm ngưng", () => expect(paymentCodeBlocker(rule({ active: false }), facts)).toMatch(/tạm ngưng/))
  it("chưa đến ngày / hết hạn", () => {
    expect(paymentCodeBlocker(rule({ startsOn: "2026-10-09" }), facts)).toMatch(/chưa đến/)
    expect(paymentCodeBlocker(rule({ endsOn: "2026-10-07" }), facts)).toMatch(/hết hạn/)
    expect(paymentCodeBlocker(rule({ endsOn: "2026-10-08" }), facts)).toBeNull()
  })
  it("hết lượt", () => {
    expect(paymentCodeBlocker(rule({ maxUses: 3 }), { ...facts, usedCount: 3 })).toMatch(/hết lượt/)
    expect(paymentCodeBlocker(rule({ maxUses: 3 }), { ...facts, usedCount: 2 })).toBeNull()
  })
  it("sai bộ sưu tập (loại đơn)", () => {
    expect(paymentCodeBlocker(rule({ catalogIds: ["cat-2"] }), facts)).toMatch(/bộ sưu tập/)
    expect(paymentCodeBlocker(rule({ catalogIds: ["cat-1"] }), facts)).toBeNull()
  })
  it("ngoài khoảng giá trị đơn; mẫu chưa có giá không kiểm được", () => {
    expect(paymentCodeBlocker(rule({ minOrderVnd: 3_000_000 }), facts)).toMatch(/từ 3\.000\.000đ/)
    expect(paymentCodeBlocker(rule({ maxOrderVnd: 1_000_000 }), facts)).toMatch(/đến 1\.000\.000đ/)
    expect(paymentCodeBlocker(rule({ minOrderVnd: 1 }), { ...facts, orderTotalVnd: null })).toMatch(/chưa có giá/)
    expect(paymentCodeBlocker(rule(), { ...facts, orderTotalVnd: null })).toBeNull()
  })
})

describe("bản chụp trên đơn", () => {
  it("mã DC30 → DEPOSIT_30, nguồn PAYMENT_CODE", () => {
    expect(planFromCode(rule())).toEqual({ policy: "DEPOSIT_30", depositPercent: 30, source: "PAYMENT_CODE", paymentCode: "DC30", campaignName: null })
  })
  it("đơn có bản chụp dùng % của đơn; đơn cũ theo tiệm", () => {
    const shop = { depositPercent: 0, requirePaidBeforeProduction: true, requireFullBeforeDispatch: true }
    const ref = { totalVnd: 2_000_000, paymentPlan: planFromCode(rule()) }
    expect(readPaymentPlan(ref)?.paymentCode).toBe("DC30")
    expect(policyForOrder(shop, ref)).toEqual({ ...shop, depositPercent: 30 })
    expect(policyForOrder(shop, { totalVnd: 1 })).toBe(shop)
    expect(readPaymentPlan({ paymentPlan: { policy: "DEPOSIT_250" } })).toBeNull()
  })
})

describe("vnToday", () => {
  it("theo giờ Việt Nam", () => {
    expect(vnToday(new Date("2026-10-08T18:00:00Z"))).toBe("2026-10-09")
    expect(vnToday(new Date("2026-10-08T16:59:00Z"))).toBe("2026-10-08")
  })
})

describe("paymentPlansErrors — màn Hồ sơ chặn lưu cấu hình sai", () => {
  const ok = parsePaymentPlans(settings)
  it("cấu hình hợp lệ", () => expect(paymentPlansErrors(ok)).toEqual([]))
  it("mã trống / trùng / sai ngày / sai khoảng giá / đợt thiếu tên", () => {
    const bad = {
      codes: [rule({ code: "" }), rule(), rule(), rule({ code: "DC9", startsOn: "2026-10-10", endsOn: "2026-10-01" }), rule({ code: "DC8", minOrderVnd: 5, maxOrderVnd: 1 })],
      campaigns: [{ id: "x", name: " ", policy: "FULL_PAYMENT", active: true, startsOn: "", endsOn: "" }],
    }
    const errors = paymentPlansErrors(bad)
    expect(errors.some((e) => /Mã thứ 1: mã gồm/.test(e))).toBe(true)
    expect(errors.some((e) => /Mã thứ 3: mã DC30 bị trùng/.test(e))).toBe(true)
    expect(errors.some((e) => /Mã thứ 4: ngày kết thúc/.test(e))).toBe(true)
    expect(errors.some((e) => /Mã thứ 5: giá trị đơn tối thiểu/.test(e))).toBe(true)
    expect(errors.some((e) => /Đợt thứ 1: cần tên/.test(e))).toBe(true)
    expect(errors.some((e) => /Đợt thứ 1: cần ngày/.test(e))).toBe(true)
  })
})
