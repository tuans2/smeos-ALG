import { describe, expect, it } from "vitest"
import { buildDispatchTitle } from "../dispatch-message-titles"
import { DEFAULT_DISPATCH_MESSAGE_TEMPLATES } from "../chain-dispatch-policy"

describe("buildDispatchTitle — mẫu tiêu đề chuẩn hóa tin chi nhánh", () => {
  it("cấp 'normal' không thêm tiền tố mức độ", () => {
    const title = buildDispatchTitle({ emoji: "📸", action: "Nhắc bàn giao", level: "normal", orderCode: "DH-1" })
    expect(title).toBe("📸 Nhắc bàn giao — Đơn #DH-1")
  })

  it("cấp 'retry' và 'escalate' dùng đúng 1 tên gọi cho mọi luồng (chống trùng câu chữ)", () => {
    const retry = buildDispatchTitle({ emoji: "⚠️", action: "Nhắc bàn giao", level: "retry", orderCode: "DH-1" })
    const escalate = buildDispatchTitle({ emoji: "🚨", action: "Nhắc bàn giao", level: "escalate", orderCode: "DH-1" })
    expect(retry).toBe("⚠️ Nhắc lần 2: Nhắc bàn giao — Đơn #DH-1")
    expect(escalate).toBe("🚨 Khẩn cấp: Nhắc bàn giao — Đơn #DH-1")

    // Hai luồng khác nhau (giao hàng vs shipper) ở cùng cấp độ phải dùng chung nhãn mức độ.
    const shipperRetry = buildDispatchTitle({ emoji: "⚠️", action: "Cần thông tin shipper", level: "retry", orderCode: "DH-2" })
    expect(shipperRetry.startsWith("⚠️ Nhắc lần 2:")).toBe(true)
  })

  it("không chứa mã kỹ thuật kiểu ngoặc vuông hay ALL CAPS (R8/R12)", () => {
    const title = buildDispatchTitle({ emoji: "🚨", action: "Cần thông tin shipper", level: "escalate", orderCode: "DH-3" })
    expect(title).not.toMatch(/\[[A-ZÀ-Ỵ0-9\s-]+\]/)
  })
})

describe("DEFAULT_DISPATCH_MESSAGE_TEMPLATES — không lộ jargon kỹ thuật ra tin gửi chi nhánh (R12)", () => {
  const BANNED_JARGON = [/\bBOM\b/i, /\bQC\b/, /\bPOD\b/, /\bSLA\b/]

  it.each(Object.entries(DEFAULT_DISPATCH_MESSAGE_TEMPLATES))("mẫu '%s' không chứa jargon cấm", (_key, template) => {
    for (const pattern of BANNED_JARGON) {
      expect(template).not.toMatch(pattern)
    }
  })

  it("không còn mã kỹ thuật kiểu [TIÊU ĐỀ VIẾT HOA] trong nội dung mẫu", () => {
    for (const template of Object.values(DEFAULT_DISPATCH_MESSAGE_TEMPLATES)) {
      expect(template).not.toMatch(/\[[A-ZÀ-Ỵ0-9\s-]+\]/)
    }
  })
})
