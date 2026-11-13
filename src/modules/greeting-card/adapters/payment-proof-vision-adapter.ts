import type { AdapterRun } from "@/core/ai/gateway"
import { extractJsonText } from "@/core/ai/adapters/llm-json"
import type { LLMProvider } from "@/core/ports/llm-provider"
import type { PaymentProofExtraction } from "../domain/payment-proof-analysis"

export const PAYMENT_PROOF_SYSTEM_PROMPT = `Bạn là chuyên gia phân tích và bóc tách biên lai chuyển khoản ngân hàng Việt Nam (Vietcombank, MBBank, Techcombank, VPBank, ACB, BIDV, Agribank, TPBank...).
Nhiệm vụ của bạn là đọc ảnh chụp màn hình chuyển khoản và trích xuất dữ liệu thành định dạng JSON chuẩn.

Hãy tìm kỹ các thông tin sau:
1. bankName: Tên ngân hàng nhận hoặc ngân hàng gửi (vd: Vietcombank, MB Bank, Techcombank...).
2. receiverAccountNumber: Số tài khoản của người thụ hưởng/nhận tiền (chỉ lấy số và chữ, bỏ khoảng trắng).
3. receiverName: Tên chủ tài khoản nhận (vd: NGUYEN VAN A).
4. amountVnd: Số tiền giao dịch bằng VNĐ (kiểu số nguyên dương, ví dụ 500000. Chú ý dấu chấm/phẩy phân cách hàng nghìn. Nếu không tìm thấy số tiền, để 0).
5. transactionTime: Thời gian thực hiện giao dịch ghi trên biên lai (chuỗi ngày giờ).
6. transactionCode: Mã giao dịch / Mã tham chiếu / Trace ID (vd: FT24287..., MB123456...).
7. isSuccessStatus: boolean. Phải là true NẾU VÀ CHỈ NẾU giao dịch ghi rõ là "Thành công", "Đã chuyển tiền", "Giao dịch đã hoàn tất". Nếu là "Chờ xử lý", "Đã đặt lệnh", "Giao dịch định kỳ", "Hẹn giờ", hoặc không rõ thì phải trả về false.
8. rawStatusText: Câu chữ thể hiện trạng thái giao dịch trên ảnh (vd: "Giao dịch thành công", "Chuyển tiền thành công").
9. notes: Nội dung chuyển khoản / Lời nhắn (nếu có).

Trả về CHÍNH XÁC một đối tượng JSON với các trường trên, không thêm bất kỳ văn bản giải thích nào khác.`

export function parsePaymentProofJson(raw: string): PaymentProofExtraction | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== "object") return null

    let amount = 0
    if (typeof parsed.amountVnd === "number") {
      amount = Math.round(parsed.amountVnd)
    } else if (typeof parsed.amountVnd === "string") {
      const cleanNum = (parsed.amountVnd as string).replace(/\D/g, "")
      amount = cleanNum ? parseInt(cleanNum, 10) : 0
    }

    return {
      bankName: typeof parsed.bankName === "string" ? parsed.bankName.trim() : undefined,
      receiverAccountNumber: typeof parsed.receiverAccountNumber === "string" ? parsed.receiverAccountNumber.replace(/\s+/g, "") : undefined,
      receiverName: typeof parsed.receiverName === "string" ? parsed.receiverName.trim() : undefined,
      amountVnd: amount,
      transactionTime: typeof parsed.transactionTime === "string" ? parsed.transactionTime.trim() : undefined,
      transactionCode: typeof parsed.transactionCode === "string" ? parsed.transactionCode.trim() : undefined,
      isSuccessStatus: Boolean(parsed.isSuccessStatus),
      rawStatusText: typeof parsed.rawStatusText === "string" ? parsed.rawStatusText.trim() : undefined,
      notes: typeof parsed.notes === "string" ? parsed.notes.trim() : undefined,
    }
  } catch {
    return null
  }
}

export function createPaymentProofVisionAdapter(
  llm: LLMProvider,
  input: { image: { mimeType: string; base64: string } },
  organizationId: string
): AdapterRun<PaymentProofExtraction> {
  return async (model) => {
    const start = Date.now()
    try {
      const res = await llm.complete({
        organizationId,
        model: model.key,
        system: PAYMENT_PROOF_SYSTEM_PROMPT,
        prompt: "Hãy trích xuất toàn bộ thông tin biên lai chuyển khoản từ bức ảnh này.",
        images: [input.image],
        jsonSchema: { type: "object" },
        maxTokens: 1000,
        timeoutMs: 45_000,
      })
      const output = parsePaymentProofJson(extractJsonText(res.text))
      if (!output) {
        return { ok: false, message: "Mô hình không trả JSON hợp lệ về thông tin biên lai" }
      }
      return {
        ok: true,
        output,
        latencyMs: Date.now() - start,
        imageCount: 1,
        ...(res.costUsd !== undefined ? { costUsd: res.costUsd } : {}),
        ...(res.inputTokens !== undefined ? { inputTokens: res.inputTokens } : {}),
        ...(res.outputTokens !== undefined ? { outputTokens: res.outputTokens } : {}),
      }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Lỗi đọc ảnh qua AI Vision" }
    }
  }
}
