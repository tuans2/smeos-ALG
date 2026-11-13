import { describe, it, expect } from "vitest"
import {
  createVietQrTransaction,
  generateTransferSyntax,
  parseTransferSyntax,
  SUBSCRIPTION_PLANS,
  CREDIT_TOPUP_OPTIONS,
} from "../vietqr-billing"

describe("VietQR Billing Domain (PAY-01 -> PAY-05)", () => {
  it("định nghĩa đầy đủ 3 gói cước thuê bao chuẩn", () => {
    expect(SUBSCRIPTION_PLANS).toHaveLength(3)
    const starter = SUBSCRIPTION_PLANS.find((p) => p.code === "STARTER")
    const growth = SUBSCRIPTION_PLANS.find((p) => p.code === "GROWTH")
    const pro = SUBSCRIPTION_PLANS.find((p) => p.code === "PRO")

    expect(starter?.priceMonthlyVnd).toBe(299_000)
    expect(growth?.priceMonthlyVnd).toBe(599_000)
    expect(pro?.priceMonthlyVnd).toBe(1_299_000)
  })

  it("tính toán chính xác bonus credit cho các gói nạp", () => {
    const pkg200 = CREDIT_TOPUP_OPTIONS.find((p) => p.code === "CR200")
    expect(pkg200?.baseCredits).toBe(200)
    expect(pkg200?.bonusCredits).toBe(60)
    expect(pkg200?.totalCredits).toBe(260) // +30%

    const pkg500 = CREDIT_TOPUP_OPTIONS.find((p) => p.code === "CR500")
    expect(pkg500?.totalCredits).toBe(750) // +50%
  })

  it("sinh cú pháp chuyển khoản FLO {ORG} {PACKAGE} {SUFFIX} và parse chính xác", () => {
    const syntax = generateTransferSyntax("TIEM_AN_NHIEN", "CR200")
    expect(syntax.startsWith("FLO TIEMANNH CR200")).toBe(true)

    const parsed = parseTransferSyntax(syntax)
    expect(parsed.isValid).toBe(true)
    expect(parsed.orgCode).toBe("TIEMANNH")
    expect(parsed.packageCode).toBe("CR200")
  })

  it("tạo payload VietQR hoàn chỉnh có link ảnh Napas 247 và thời hạn hết hạn 15 phút", () => {
    const res = createVietQrTransaction({
      orgCode: "TIEM_HOA_XINH",
      amountVnd: 200_000,
      packageCode: "CR200",
      itemType: "CREDIT_TOPUP",
    })

    expect(res.amountVnd).toBe(200_000)
    expect(res.bankName).toContain("MB Bank")
    expect(res.accountNumber).toBe("0388889999")
    expect(res.qrImageUrl).toContain("img.vietqr.io/image/970422-0388889999-compact2.png")
    expect(res.qrImageUrl).toContain("amount=200000")
    expect(res.expiresAt).toBeDefined()

    const expiryTime = new Date(res.expiresAt).getTime()
    const now = Date.now()
    // Hết hạn sau khoảng 15 phút (cho phép sai số 10s)
    expect(expiryTime - now).toBeGreaterThan(14 * 60 * 1000)
    expect(expiryTime - now).toBeLessThanOrEqual(15 * 60 * 1000 + 5000)
  })
})
