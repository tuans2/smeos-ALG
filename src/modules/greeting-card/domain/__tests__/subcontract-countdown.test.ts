/**
 * subcontract-countdown.test.ts
 *
 * Kiểm thử đơn vị cho bộ tính toán mốc thời gian hoàn thành (Deadlines) và bộ đếm ngược.
 */

import { describe, it, expect } from "vitest"
import {
  parseDeliveryTimestampMs,
  calculateStepMilestoneDeadlines,
  calculateCountdownState,
  formatTargetTimeHm,
} from "../subcontract-countdown"

describe("subcontract-countdown", () => {
  it("phân tích delivery date và timeSlot đúng giờ Việt Nam UTC+7", () => {
    const ms = parseDeliveryTimestampMs("2026-10-21", "08:00 - 10:00")
    expect(ms).not.toBeNull()
    const dt = new Date(ms!)
    // 10:00 UTC+7 là 03:00 UTC
    expect(dt.getUTCHours()).toBe(3)
    expect(dt.getUTCMinutes()).toBe(0)
  })

  it("tính toán các mốc deadlines chính xác theo thứ tự", () => {
    const deliveryMs = new Date("2026-10-21T03:00:00.000Z").getTime() // 10:00 VN
    const graceIso = "2026-10-20T12:05:00.000Z"

    const deadlines = calculateStepMilestoneDeadlines({
      deliveryTimestampMs: deliveryMs,
      graceExpiresAt: graceIso,
      qcMinutesBefore: 45,
      shipperMinutesBefore: 30,
    })

    expect(deadlines.step1GraceExpiresAt).toBe(graceIso)
    // QC: 10:00 - 45m = 09:15 VN (02:15 UTC)
    expect(formatTargetTimeHm(deadlines.step2QcDeadlineMs)).toBe("09:15")
    // Shipper: 10:00 - 30m = 09:30 VN (02:30 UTC)
    expect(formatTargetTimeHm(deadlines.step3ShipperDeadlineMs)).toBe("09:30")
    // POD: 10:00 VN
    expect(formatTargetTimeHm(deadlines.step4DeliveryDeadlineMs)).toBe("10:00")
  })

  it("tính countdown state chính xác khi còn thời gian", () => {
    const nowMs = 1000_000
    const targetMs = nowMs + 15 * 60 * 1000 + 30 * 1000 // 15 phút 30 giây
    const state = calculateCountdownState(targetMs, nowMs)

    expect(state).not.toBeNull()
    expect(state?.isOverdue).toBe(false)
    expect(state?.minutes).toBe(15)
    expect(state?.seconds).toBe(30)
    expect(state?.formatted).toBe("15:30")
  })

  it("tính countdown state chính xác khi quá hạn", () => {
    const nowMs = 1000_000
    const targetMs = nowMs - 12 * 60 * 1000 // Quá hạn 12 phút
    const state = calculateCountdownState(targetMs, nowMs)

    expect(state).not.toBeNull()
    expect(state?.isOverdue).toBe(true)
    expect(state?.formatted).toBe("Quá 12 phút")
  })
})

describe("giờ giao dùng chung cho sweep (rà soát cụm G, G-c)", () => {
  it("lấy cuối khung giờ; khung dạng chữ (\"Trước 12h\") vẫn ra giờ", async () => {
    const { parseDeliveryTimestampMs } = await import("../subcontract-countdown")
    expect(parseDeliveryTimestampMs("2027-01-10", "16:00 - 18:00")).toBe(new Date("2027-01-10T18:00:00+07:00").getTime())
    expect(parseDeliveryTimestampMs("2027-01-10", "Trước 12h")).toBe(new Date("2027-01-10T12:00:00+07:00").getTime())
    expect(parseDeliveryTimestampMs(null, "16:00 - 18:00")).toBeNull()
  })
})
