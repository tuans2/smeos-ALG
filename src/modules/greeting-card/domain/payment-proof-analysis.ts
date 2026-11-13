/**
 * Domain entity: Kết quả phân tích và thẩm định biên lai chuyển khoản (Payment Proof Analysis).
 * Tuân thủ Clean Architecture, SRP và không import cơ sở dữ liệu.
 */

export type PaymentProofMatchStatus =
  | "PENDING"          // Đang phân tích ngầm
  | "MATCHED"          // Khớp hoàn toàn: đúng STK/tên shop và đúng/đủ số tiền
  | "AMOUNT_MISMATCH"  // Đúng STK shop nhưng số tiền chuyển lệch (thiếu hoặc thừa)
  | "ACCOUNT_MISMATCH" // Sai số tài khoản hoặc ngân hàng thụ hưởng (không phải của shop)
  | "SUSPICIOUS"       // Nghi vấn: Bill chờ xử lý, hẹn giờ, bill cũ hoặc không hợp lệ
  | "UNREADABLE"       // Ảnh mờ, không phải bill ngân hàng hoặc không đọc được số liệu

export interface PaymentProofExtraction {
  bankName?: string | undefined
  receiverAccountNumber?: string | undefined
  receiverName?: string | undefined
  amountVnd: number
  transactionTime?: string | undefined
  transactionCode?: string | undefined
  isSuccessStatus: boolean
  rawStatusText?: string | undefined
  notes?: string | undefined
}

export interface PaymentProofAnalysisResult {
  status: PaymentProofMatchStatus
  extracted: PaymentProofExtraction
  expectedAmountVnd: number
  amountDifferenceVnd: number
  confidenceScore: number
  reasons: string[]
  analyzedAt: string
}

export interface VerifyBillInput {
  extracted: PaymentProofExtraction
  expectedAmountVnd: number
  shopBank?: {
    bankId?: string | undefined
    bankName?: string | undefined
    accountNo?: string | undefined
    accountName?: string | undefined
  } | null | undefined
}

/**
 * Chuẩn hóa chuỗi số tài khoản: chỉ giữ ký tự chữ và số viết liền
 */
export function normalizeAccountNumber(acc?: string | null): string {
  if (!acc) return ""
  return acc.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
}

/**
 * Kiểm tra xem 2 số tài khoản có tương đồng không (cho phép bỏ qua số 0 ở đầu nếu ngân hàng khác nhau chuẩn định dạng)
 */
export function isAccountNumberMatching(acc1?: string | null, acc2?: string | null): boolean {
  const norm1 = normalizeAccountNumber(acc1)
  const norm2 = normalizeAccountNumber(acc2)
  if (!norm1 || !norm2) return false
  if (norm1 === norm2) return true
  // Khớp đuôi tối thiểu 6 số cuối nếu 1 bên có prefix mã chi nhánh
  if (norm1.length >= 6 && norm2.length >= 6) {
    return norm1.endsWith(norm2) || norm2.endsWith(norm1)
  }
  return false
}

/**
 * Thẩm định kết quả bóc tách bill so với thông tin đơn hàng và tài khoản của tiệm
 */
export function verifyBillAgainstOrder(input: VerifyBillInput): PaymentProofAnalysisResult {
  const { extracted, expectedAmountVnd, shopBank } = input
  const reasons: string[] = []
  let confidenceScore = 0.9

  // 1. Kiểm tra trạng thái giao dịch
  if (!extracted.isSuccessStatus) {
    reasons.push("Trạng thái giao dịch không phải thành công (có thể là lệnh chờ xử lý hoặc hẹn giờ)")
  }

  // 2. Kiểm tra số tài khoản nhận tiền
  // Tiệm chưa cài tài khoản nhận tiền → không thể xác nhận bill chuyển đúng chỗ, không bao giờ "khớp"
  let accountMatched = Boolean(shopBank?.accountNo)
  if (!accountMatched) reasons.push("Tiệm chưa cài số tài khoản nhận tiền nên chưa đối chiếu được tài khoản thụ hưởng")
  if (shopBank && shopBank.accountNo) {
    if (!extracted.receiverAccountNumber) {
      accountMatched = false
      reasons.push("Không nhận diện được số tài khoản thụ hưởng trên ảnh")
    } else if (!isAccountNumberMatching(extracted.receiverAccountNumber, shopBank.accountNo)) {
      accountMatched = false
      reasons.push(`Số tài khoản nhận (${extracted.receiverAccountNumber}) không khớp với tài khoản tiệm (${shopBank.accountNo})`)
    }
  }

  // 3. Kiểm tra số tiền
  const diff = extracted.amountVnd - expectedAmountVnd
  const isAmountMatched = Math.abs(diff) <= 1000 // Chấp nhận sai số làm tròn tối đa 1.000đ

  if (!isAmountMatched) {
    if (diff < 0) {
      reasons.push(`Chuyển thiếu ${Math.abs(diff).toLocaleString("vi-VN")} đ so với số tiền cần thu`)
    } else {
      reasons.push(`Chuyển thừa ${diff.toLocaleString("vi-VN")} đ so với số tiền cần thu`)
    }
  }

  // 4. Quyết định trạng thái tổng thể
  let status: PaymentProofMatchStatus = "MATCHED"

  if (!extracted.isSuccessStatus) {
    status = "SUSPICIOUS"
    confidenceScore = 0.5
  } else if (!accountMatched) {
    status = "ACCOUNT_MISMATCH"
    confidenceScore = 0.8
  } else if (!isAmountMatched) {
    status = "AMOUNT_MISMATCH"
    confidenceScore = 0.85
  } else if (reasons.length === 0) {
    status = "MATCHED"
    confidenceScore = 0.95
  }

  return {
    status,
    extracted,
    expectedAmountVnd,
    amountDifferenceVnd: diff,
    confidenceScore,
    reasons,
    analyzedAt: new Date().toISOString(),
  }
}

/**
 * Bill có mã giao dịch đã xuất hiện trên ảnh bill của đơn khác (khách dùng lại bill cũ) → nghi vấn,
 * không bao giờ được tự duyệt (PO 14/10/2026).
 */
export function markDuplicateBill(analysis: PaymentProofAnalysisResult, duplicate: boolean): PaymentProofAnalysisResult {
  if (!duplicate) return analysis
  return {
    ...analysis,
    status: "SUSPICIOUS",
    confidenceScore: Math.min(analysis.confidenceScore, 0.3),
    reasons: [...analysis.reasons, `Mã giao dịch ${analysis.extracted.transactionCode ?? ""} đã được dùng cho một ảnh chuyển khoản khác`],
  }
}

