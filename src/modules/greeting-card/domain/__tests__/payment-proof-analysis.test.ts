import { describe, expect, it } from "vitest"
import {
  isAccountNumberMatching,
  markDuplicateBill,
  normalizeAccountNumber,
  verifyBillAgainstOrder,
  type PaymentProofExtraction,
} from "../payment-proof-analysis"

describe("payment-proof-analysis domain", () => {
  describe("normalizeAccountNumber & isAccountNumberMatching", () => {
    it("chuẩn hoá và so khớp chính xác số tài khoản có dấu cách", () => {
      expect(normalizeAccountNumber(" 0011 2233 44 ")).toBe("0011223344")
      expect(isAccountNumberMatching("0011 2233 44", "0011223344")).toBe(true)
    })

    it("so khớp đuôi tài khoản hợp lệ", () => {
      expect(isAccountNumberMatching("00710011223344", "10011223344")).toBe(true)
    })

    it("từ chối khi số tài khoản khác hẳn nhau", () => {
      expect(isAccountNumberMatching("12345678", "87654321")).toBe(false)
    })
  })

  describe("verifyBillAgainstOrder", () => {
    const shopBank = {
      bankId: "VCB",
      bankName: "Vietcombank",
      accountNo: "1234567890",
      accountName: "TIEM HOA FLORA",
    }

    const validExtraction: PaymentProofExtraction = {
      bankName: "Vietcombank",
      receiverAccountNumber: "1234567890",
      receiverName: "TIEM HOA FLORA",
      amountVnd: 500000,
      transactionTime: "2026-10-13 14:30:00",
      transactionCode: "FT26101389",
      isSuccessStatus: true,
      rawStatusText: "Chuyển tiền thành công",
    }

    it("trả về MATCHED khi đúng STK và đủ tiền", () => {
      const res = verifyBillAgainstOrder({
        extracted: validExtraction,
        expectedAmountVnd: 500000,
        shopBank,
      })
      expect(res.status).toBe("MATCHED")
      expect(res.amountDifferenceVnd).toBe(0)
      expect(res.reasons).toHaveLength(0)
    })

    it("trả về AMOUNT_MISMATCH khi chuyển thiếu tiền", () => {
      const res = verifyBillAgainstOrder({
        extracted: { ...validExtraction, amountVnd: 450000 },
        expectedAmountVnd: 500000,
        shopBank,
      })
      expect(res.status).toBe("AMOUNT_MISMATCH")
      expect(res.amountDifferenceVnd).toBe(-50000)
      expect(res.reasons[0]).toContain("Chuyển thiếu 50.000 đ")
    })

    it("trả về ACCOUNT_MISMATCH khi sai số tài khoản thụ hưởng", () => {
      const res = verifyBillAgainstOrder({
        extracted: { ...validExtraction, receiverAccountNumber: "9999888877" },
        expectedAmountVnd: 500000,
        shopBank,
      })
      expect(res.status).toBe("ACCOUNT_MISMATCH")
      expect(res.reasons[0]).toContain("không khớp với tài khoản tiệm")
    })

    it("trả về SUSPICIOUS khi giao dịch không phải trạng thái thành công", () => {
      const res = verifyBillAgainstOrder({
        extracted: { ...validExtraction, isSuccessStatus: false, rawStatusText: "Đang chờ xử lý" },
        expectedAmountVnd: 500000,
        shopBank,
      })
      expect(res.status).toBe("SUSPICIOUS")
      expect(res.reasons[0]).toContain("không phải thành công")
    })

    it("tiệm chưa cài tài khoản nhận tiền → không bao giờ MATCHED (không được tự duyệt)", () => {
      for (const bank of [null, {}, { accountNo: "" }]) {
        const res = verifyBillAgainstOrder({ extracted: validExtraction, expectedAmountVnd: 500000, shopBank: bank })
        expect(res.status).toBe("ACCOUNT_MISMATCH")
      }
    })
  })
})

describe("markDuplicateBill", () => {
  const base = {
    status: "MATCHED" as const,
    extracted: { amountVnd: 500000, isSuccessStatus: true, transactionCode: "FT123456" },
    expectedAmountVnd: 500000,
    amountDifferenceVnd: 0,
    confidenceScore: 0.95,
    reasons: [],
    analyzedAt: "2026-10-14T00:00:00.000Z",
  }

  it("bill dùng lại (mã giao dịch đã có ở ảnh khác) → SUSPICIOUS, không còn MATCHED", () => {
    const res = markDuplicateBill(base, true)
    expect(res.status).toBe("SUSPICIOUS")
    expect(res.reasons.join(" ")).toContain("FT123456")
  })

  it("không trùng → giữ nguyên kết quả", () => {
    expect(markDuplicateBill(base, false)).toBe(base)
  })
})
