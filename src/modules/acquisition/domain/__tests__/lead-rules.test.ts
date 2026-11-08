import { describe, expect, it } from "vitest"
import {
  canTransitionLeadStatus,
  isLeadStatus,
  LEAD_STATUS_GROUPS,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  OPEN_LEAD_STATUSES,
  sanitizeUtmValue,
  validateLeadInput,
} from "../lead-rules"

const ok = { name: "Lan", phone: "0901 234 567", message: "Hỏi giá", consent: true }

describe("validateLeadInput", () => {
  it("chấp nhận dữ liệu hợp lệ (SĐT có khoảng trắng)", () => {
    expect(validateLeadInput(ok)).toEqual({})
  })
  it("bắt buộc đồng ý liên hệ", () => {
    expect(validateLeadInput({ ...ok, consent: false }).consent).toBeDefined()
  })
  it("từ chối SĐT không phải di động Việt Nam", () => {
    expect(validateLeadInput({ ...ok, phone: "12345678" }).phone).toBeDefined()
    expect(validateLeadInput({ ...ok, phone: "+84901234567" }).phone).toBeUndefined()
  })
  it("bắt buộc tên, giới hạn độ dài tên và lời nhắn", () => {
    expect(validateLeadInput({ ...ok, name: "  " }).name).toBeDefined()
    expect(validateLeadInput({ ...ok, name: "a".repeat(101) }).name).toBeDefined()
    expect(validateLeadInput({ ...ok, message: "a".repeat(501) }).message).toBeDefined()
  })
})

describe("sanitizeUtmValue", () => {
  it("chuẩn hoá chữ thường, thay ký tự lạ bằng gạch, rỗng → null", () => {
    expect(sanitizeUtmValue(" Tờ Rơi 20/10 ")).toBe("t-r-i-20-10")
    expect(sanitizeUtmValue("<script>")).toBe("script")
    expect(sanitizeUtmValue("   ")).toBeNull()
    expect(sanitizeUtmValue(undefined)).toBeNull()
    expect(sanitizeUtmValue("a".repeat(100))).toHaveLength(60)
  })
})

describe("Pipeline 10 trạng thái (PO 01/11/2026, PR-3)", () => {
  it("đủ 10 trạng thái chuẩn và có nhãn tiếng Việt", () => {
    expect(LEAD_STATUSES).toHaveLength(10)
    expect(LEAD_STATUSES).toEqual([
      "NEW",
      "QUALIFIED",
      "CONTACTED",
      "CONSULTING",
      "RECOMMENDED",
      "QUOTATION_SENT",
      "FOLLOW_UP",
      "WON",
      "LOST",
      "UNQUALIFIED",
    ])
    for (const status of LEAD_STATUSES) {
      expect(LEAD_STATUS_LABELS[status]).toBeDefined()
      expect(isLeadStatus(status)).toBe(true)
    }
    expect(isLeadStatus("DELETED")).toBe(false)
  })

  it("tập mở gồm 7 trạng thái trước khi đóng chốt/thất bại", () => {
    expect(OPEN_LEAD_STATUSES).toHaveLength(7)
    expect(OPEN_LEAD_STATUSES).toContain("NEW")
    expect(OPEN_LEAD_STATUSES).toContain("QUOTATION_SENT")
    expect(OPEN_LEAD_STATUSES).not.toContain("WON")
    expect(OPEN_LEAD_STATUSES).not.toContain("LOST")
  })

  it("4 nhóm progressive disclosure bao phủ toàn bộ 10 trạng thái", () => {
    const allGroupedStatuses = LEAD_STATUS_GROUPS.flatMap((g) => g.statuses)
    expect(allGroupedStatuses).toHaveLength(10)
    expect(new Set(allGroupedStatuses).size).toBe(10)
  })

  it("luật chuyển trạng thái hợp lệ và từ chối bước nhảy phi lý", () => {
    // NEW không thể nhảy thẳng sang WON
    expect(canTransitionLeadStatus("NEW", "WON")).toBe(false)
    // Khách bỏ sau khi chốt (đơn huỷ) → không thành được (UJ-13)
    expect(canTransitionLeadStatus("WON", "LOST")).toBe(true)
    // NEW có thể sang QUALIFIED hoặc CONTACTED
    expect(canTransitionLeadStatus("NEW", "QUALIFIED")).toBe(true)
    expect(canTransitionLeadStatus("NEW", "CONTACTED")).toBe(true)

    // CONSULTING có thể sang RECOMMENDED, QUOTATION_SENT, WON, LOST
    expect(canTransitionLeadStatus("CONSULTING", "RECOMMENDED")).toBe(true)
    expect(canTransitionLeadStatus("CONSULTING", "QUOTATION_SENT")).toBe(true)
    expect(canTransitionLeadStatus("CONSULTING", "WON")).toBe(true)
    expect(canTransitionLeadStatus("CONSULTING", "LOST")).toBe(true)

    // Giữ nguyên trạng thái luôn hợp lệ
    expect(canTransitionLeadStatus("NEW", "NEW")).toBe(true)

    // Dữ liệu cũ IN_PROGRESS tương đương CONTACTED
    expect(canTransitionLeadStatus("IN_PROGRESS", "CONSULTING")).toBe(true)
    expect(canTransitionLeadStatus("IN_PROGRESS", "QUOTATION_SENT")).toBe(true)
  })
})
