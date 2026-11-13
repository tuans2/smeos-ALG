import { describe, it, expect, vi } from "vitest"
import { resolvePaymentPlan } from "../payment-plan-quote"

type Checkout = NonNullable<Parameters<typeof resolvePaymentPlan>[3]>

const settings = {
  brochure_policy: { deposit_percent: 0 },
  brochure_payment_plans: {
    campaigns: [{ id: "c2010", name: "Ngày 20/10", policy: "FULL_PAYMENT", starts_on: "2026-10-18", ends_on: "2026-10-20" }],
    codes: [
      { code: "DC30", policy: "DEPOSIT_30" },
      { code: "DC50", policy: "DEPOSIT_50", max_uses: 1 },
      { code: "DCOLD", policy: "DEPOSIT_30", ends_on: "2026-10-01" },
    ],
  },
}
const now = new Date("2026-10-08T03:00:00Z")

function checkout(uses = 0, voucher: unknown = null) {
  const countPaymentCodeUses = vi.fn().mockResolvedValue(uses)
  const findVoucher = vi.fn().mockResolvedValue(voucher)
  return { countPaymentCodeUses, repo: { countPaymentCodeUses, findVoucher } as unknown as Checkout }
}
const input = (paymentCode?: string) => ({ paymentCode, totalVnd: 2_000_000, catalogId: "cat-1", deliveryDate: "2026-10-12" })

describe("resolvePaymentPlan — mã thanh toán chỉ kiểm ở máy chủ", () => {
  it("không nhập mã → theo mặc định của tiệm", async () => {
    const r = await resolvePaymentPlan("org-1", settings, input(), checkout().repo, now)
    expect(r).toEqual({ plan: expect.objectContaining({ policy: "FULL_PAYMENT", source: "SHOP_DEFAULT" }), rule: null, error: null })
  })

  it("DC30 hợp lệ → DEPOSIT_30", async () => {
    const r = await resolvePaymentPlan("org-1", settings, input("dc30"), checkout().repo, now)
    expect(r.error).toBeNull()
    expect(r.plan).toMatchObject({ policy: "DEPOSIT_30", depositPercent: 30, source: "PAYMENT_CODE", paymentCode: "DC30" })
  })

  it("DC50 hợp lệ → DEPOSIT_50 (đếm lượt chỉ khi mã có giới hạn)", async () => {
    const c = checkout(0)
    const r = await resolvePaymentPlan("org-1", settings, input("DC50"), c.repo, now)
    expect(r.plan.policy).toBe("DEPOSIT_50")
    expect(c.countPaymentCodeUses).toHaveBeenCalledWith("org-1", "DC50")
  })

  it("mã không tồn tại / hết hạn / hết lượt → báo lỗi, giữ policy mặc định", async () => {
    for (const [code, uses, msg] of [["DC99", 0, /không tồn tại/], ["DCOLD", 0, /hết hạn/], ["DC50", 1, /hết lượt/]] as const) {
      const r = await resolvePaymentPlan("org-1", settings, input(code), checkout(uses).repo, now)
      expect(r.error).toMatch(msg)
      expect(r.rule).toBeNull()
      expect(r.plan).toMatchObject({ policy: "FULL_PAYMENT", source: "SHOP_DEFAULT", paymentCode: null })
    }
  })

  it("gõ nhầm mã giảm giá vào ô mã thanh toán → chỉ sang ô Mã giảm giá (khi tiệm bật mã giảm giá)", async () => {
    const withVouchers = { ...settings, brochure_shipping: { voucher_enabled: true } }
    const r = await resolvePaymentPlan("org-1", withVouchers, input("GIAM10"), checkout(0, { id: "v1" }).repo, now)
    expect(r.error).toMatch(/mã giảm giá/)
    expect(r.plan.policy).toBe("FULL_PAYMENT")
    // Tiệm tắt mã giảm giá → không gợi ý ô đang ẩn
    expect((await resolvePaymentPlan("org-1", settings, input("GIAM10"), checkout(0, { id: "v1" }).repo, now)).error).toMatch(/không tồn tại/)
  })

  it("khách nhập phần trăm thay vì mã → không được chấp nhận", async () => {
    const r = await resolvePaymentPlan("org-1", settings, input("30%"), checkout().repo, now)
    expect(r.error).toMatch(/không tồn tại/)
    expect(r.plan.depositPercent).toBe(0)
  })

  it("đợt 20/10 (theo ngày giao) → mặc định thu 100%; mã thanh toán vẫn ghi đè được", async () => {
    const day = { ...input(), deliveryDate: "2026-10-20" }
    const shop = { ...settings, brochure_policy: { deposit_percent: 30 } }
    expect((await resolvePaymentPlan("org-1", shop, day, checkout().repo, now)).plan).toMatchObject({ policy: "FULL_PAYMENT", source: "CAMPAIGN" })
    expect((await resolvePaymentPlan("org-1", shop, { ...day, paymentCode: "DC30" }, checkout().repo, now)).plan.policy).toBe("DEPOSIT_30")
  })
})
