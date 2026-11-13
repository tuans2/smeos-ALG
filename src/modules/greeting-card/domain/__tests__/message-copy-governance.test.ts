/**
 * Lưới kiểm chuẩn chung cho MỌI nguồn câu chữ gửi cửa hàng / nhân viên trong Thẻ Chào.
 *
 * Hệ thống hiện có nhiều nguồn tạo nội dung theo nhu cầu kỹ thuật khác nhau (mẫu tùy biến theo
 * tổ chức, câu theo ngành, nhãn cài đặt, điều khoản) nên không gộp thành một cấu trúc dữ liệu
 * duy nhất — rủi ro hơn lợi ích. Thay vào đó, test này quét TẤT CẢ các nguồn qua cùng 1 bộ luật
 * (R8/R12 — không mã kỹ thuật, không jargon) để đảm bảo chuẩn chung được giữ xuyên suốt, dù câu
 * chữ nằm ở module nào. Rà soát 23/10/2026 — xem docs/copywriting-inventory/.
 */
import { describe, expect, it } from "vitest"
import { STAFF_NOTIFY_EVENTS, STAFF_NOTIFY_EVENT_LABELS, STAFF_NOTIFY_CHANNEL_LABELS } from "../staff-notification-types"
import { formatIndustryStaffNotificationText } from "../industry-notification-formatter"
import { DEFAULT_DISPATCH_MESSAGE_TEMPLATES } from "../chain-dispatch-policy"
import { DEFAULT_PROMOTIONS, DEFAULT_COMMITMENTS, DEFAULT_AGREEMENTS } from "../store-policy"

const BANNED_JARGON = [/\bBOM\b/i, /\bQC\b/, /\bPOD\b/, /\bSLA\b/, /\bPII\b/, /\bEntity\b/, /\bPayload\b/i]
const TECH_CODE_BRACKET = /\[[A-ZÀ-Ỵ0-9][A-ZÀ-Ỵ0-9\s-]*\]/ // "[NHẮC LẦN 2]" kiểu mã — khác "[Đơn DH-001]" (có số/ký tự thường trộn)

function expectCleanCopy(label: string, text: string) {
  for (const pattern of BANNED_JARGON) {
    expect(text, `${label}: "${text}" chứa jargon cấm (R12)`).not.toMatch(pattern)
  }
}

const INDUSTRIES = [null, "HOMESTAY", "FNB", "FASHION", "SERVICES"] as const

describe("Kiểm chuẩn câu chữ xuyên suốt hệ thống (R8/R12) — mọi nguồn nội dung gửi cửa hàng/nhân viên", () => {
  it("industry-notification-formatter: không jargon, không mã kỹ thuật ở mọi ngành × mọi sự kiện", () => {
    for (const industryKey of INDUSTRIES) {
      for (const event of STAFF_NOTIFY_EVENTS) {
        const result = formatIndustryStaffNotificationText(event, {
          orderCode: "DH-001",
          customerName: "Khách A",
          productName: "Sản phẩm",
          amountVnd: 100_000,
          industryKey,
        })
        if (!result) continue // Không phải mọi ngành đều có đủ 11 sự kiện (theo đặc thù nghiệp vụ)
        expectCleanCopy(`[${industryKey ?? "default"}] ${event} title`, result.title)
        expectCleanCopy(`[${industryKey ?? "default"}] ${event} message`, result.message)
        expect(result.title, `[${industryKey ?? "default"}] ${event} title có mã kỹ thuật kiểu ngoặc vuông`).not.toMatch(TECH_CODE_BRACKET)
      }
    }
  })

  it("chain-dispatch-policy: mẫu tin điều phối chi nhánh không jargon, không mã kỹ thuật", () => {
    for (const [key, template] of Object.entries(DEFAULT_DISPATCH_MESSAGE_TEMPLATES)) {
      expectCleanCopy(`messageTemplates.${key}`, template)
      expect(template, `messageTemplates.${key} có mã kỹ thuật kiểu ngoặc vuông`).not.toMatch(TECH_CODE_BRACKET)
    }
  })

  it("staff-notification-types: nhãn sự kiện/kênh hiển thị trong màn cài đặt không jargon", () => {
    for (const [event, label] of Object.entries(STAFF_NOTIFY_EVENT_LABELS)) {
      expectCleanCopy(`STAFF_NOTIFY_EVENT_LABELS.${event}`, label)
    }
    for (const [channel, label] of Object.entries(STAFF_NOTIFY_CHANNEL_LABELS)) {
      expectCleanCopy(`STAFF_NOTIFY_CHANNEL_LABELS.${channel}`, label)
    }
  })

  it("store-policy: tiêu đề/nội dung ưu đãi, cam kết, thỏa thuận không jargon và không dùng '&'", () => {
    const allItems = [...DEFAULT_PROMOTIONS, ...DEFAULT_COMMITMENTS, ...DEFAULT_AGREEMENTS]
    for (const item of allItems) {
      expectCleanCopy(`${item.id}.title`, item.title)
      expect(item.title, `${item.id}.title dùng '&' thay vì 'và'`).not.toMatch(/&/)
      const texts = [
        "description" in item ? item.description : undefined,
        "customerText" in item ? item.customerText : undefined,
        "internalText" in item ? item.internalText : undefined,
      ].filter((t): t is string => typeof t === "string")
      for (const text of texts) {
        expectCleanCopy(`${item.id} (nội dung)`, text)
      }
    }
  })
})
