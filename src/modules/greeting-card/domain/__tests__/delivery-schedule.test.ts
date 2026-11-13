import { describe, it, expect } from "vitest"
import {
  availableSlots,
  deliveryScheduleError,
  earliestDeliveryDate,
  readyHour,
  viDeliveryDate,
  viShortDate,
} from "../delivery-schedule"

// Helper tạo Date tương ứng giờ Việt Nam (GMT+7)
function vnDate(year: number, month: number, day: number, hour: number, minute: number = 0): Date {
  const utcHour = hour - 7
  return new Date(Date.UTC(year, month - 1, day, utcHour, minute, 0))
}

describe("availableSlots — Phương án hiển thị tối ưu (Lọc ca chuẩn, không chèn ca lẻ đè nhau)", () => {
  const TODAY = "2026-10-10"
  const TOMORROW = "2026-10-11"

  it("lúc 15:25 chiều (ảnh thực tế của khách): ca hợp lệ là 18:00 - 20:00 và 20:00 - 22:00 (không có ca 17:30 đè lên 18:00)", () => {
    const now = vnDate(2026, 10, 10, 15, 25) // readyHour = 17:25
    const slots = availableSlots(TODAY, {}, now)
    // Tuyệt đối không sinh ca lẻ 17:30 - 19:30 đè lên 18:00 - 20:00
    expect(slots).toEqual(["18:00 - 20:00", "20:00 - 22:00"])
    expect(slots).not.toContain("17:30 - 19:30")
    expect(slots).not.toContain("16:00 - 18:00")
  })

  it("lúc 11:35 AM (lead time 2h): sớm nhất là ca 14:00 - 16:00 (ca 12:00 - 14:00 bị ẩn)", () => {
    const now = vnDate(2026, 10, 10, 11, 35) // readyHour = 13:35
    const slots = availableSlots(TODAY, {}, now)
    expect(slots[0]).toBe("14:00 - 16:00")
    expect(slots).not.toContain("12:00 - 14:00")
    expect(slots).toEqual(["14:00 - 16:00", "16:00 - 18:00", "18:00 - 20:00", "20:00 - 22:00"])
  })

  it("lúc 10:00 AM (lead time 2h): sẵn sàng lúc 12:00 -> ca sớm nhất là 12:00 - 14:00", () => {
    const now = vnDate(2026, 10, 10, 10, 0) // readyHour = 12:00
    const slots = availableSlots(TODAY, {}, now)
    expect(slots[0]).toBe("12:00 - 14:00")
    expect(slots).not.toContain("10:00 - 12:00")
  })

  it("lúc 11:00 AM với cấu hình rút ngắn chuẩn bị 1h (prepHours = 1): sẵn sàng lúc 12:00 -> ca 12:00 - 14:00", () => {
    const now = vnDate(2026, 10, 10, 11, 0) // 11:00 + 1h = 12:00
    const slots = availableSlots(TODAY, { prepHours: 1.0 }, now)
    expect(slots[0]).toBe("12:00 - 14:00")
  })

  it("chọn ngày tương lai (ngày mai): hiển thị toàn bộ khung tiệm đang bật", () => {
    const now = vnDate(2026, 10, 10, 15, 25)
    const slots = availableSlots(TOMORROW, {}, now)
    expect(slots).toEqual([
      "08:00 - 10:00",
      "10:00 - 12:00",
      "12:00 - 14:00",
      "14:00 - 16:00",
      "16:00 - 18:00",
      "18:00 - 20:00",
      "20:00 - 22:00",
    ])
  })

  it("đặt quá muộn (sau 20:00, vd 20:30): không còn ca nào kịp trong ngày -> hết khung", () => {
    const now = vnDate(2026, 10, 10, 20, 30) // 20:30 + 2h = 22:30 > 20:00 (ca cuối 20-22)
    const slots = availableSlots(TODAY, {}, now)
    expect(slots).toEqual([])
    expect(earliestDeliveryDate({}, now)).toBe(TOMORROW)
  })
})

describe("deliveryScheduleError", () => {
  const TODAY = "2026-10-10"

  it("lúc 15:25: chặn ca 16:00 - 18:00 vì không đủ 2 tiếng chuẩn bị, chấp nhận 18:00 - 20:00", () => {
    const now = vnDate(2026, 10, 10, 15, 25)
    expect(deliveryScheduleError(TODAY, "16:00 - 18:00", {}, now)).toMatch(/không còn kịp chuẩn bị/)
    expect(deliveryScheduleError(TODAY, "18:00 - 20:00", {}, now)).toBeNull()
    expect(deliveryScheduleError(TODAY, "20:00 - 22:00", {}, now)).toBeNull()
  })

  it("lúc 11:35 AM: chặn 12:00 - 14:00, chấp nhận 14:00 - 16:00", () => {
    const now = vnDate(2026, 10, 10, 11, 35)
    expect(deliveryScheduleError(TODAY, "12:00 - 14:00", {}, now)).toMatch(/không còn kịp chuẩn bị/)
    expect(deliveryScheduleError(TODAY, "14:00 - 16:00", {}, now)).toBeNull()
  })

  it("kiểm tra giờ cụ thể (custom time): chặn giờ trước thời gian chuẩn bị", () => {
    const now = vnDate(2026, 10, 10, 15, 25) // readyHour = 17:25
    expect(deliveryScheduleError(TODAY, "Giờ cụ thể: 17:00", {}, now)).toMatch(/không còn kịp chuẩn bị/)
    expect(deliveryScheduleError(TODAY, "Giờ cụ thể: 17:30", {}, now)).toBeNull()
    expect(deliveryScheduleError(TODAY, "Giờ cụ thể: 18:00", {}, now)).toBeNull()
  })
})

describe("viDeliveryDate", () => {
  it("hiện ngày giao kiểu Việt Nam, không theo ngôn ngữ máy khách", () => {
    expect(viDeliveryDate("2026-10-16")).toBe("Thứ Sáu, 16/10/2026")
    expect(viDeliveryDate("2026-10-18")).toBe("Chủ Nhật, 18/10/2026")
  })

  it("giá trị rỗng / sai định dạng giữ nguyên", () => {
    expect(viDeliveryDate("")).toBe("")
    expect(viDeliveryDate("16 Oct 2026")).toBe("16 Oct 2026")
  })
})

describe("viShortDate", () => {
  it("ngày gọn kiểu Việt Nam cho ô lọc phía nhân viên; sai định dạng giữ nguyên", () => {
    expect(viShortDate("2026-10-16")).toBe("16/10/2026")
    expect(viShortDate("")).toBe("")
  })
})
