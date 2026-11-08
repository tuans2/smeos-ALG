import { describe, expect, it } from "vitest"

import { CHANNEL_RULES, composeCaption, normalizeHashtags, titleFrom, validatePost } from "./channel-rules"
import { MAX_PUBLISH_ATTEMPTS, canCancel, canRetry, isDue, outcomeAfterFailure } from "./post-lifecycle"
import { MIN_LEAD_MS, nextGoldenSlot, planTimes } from "./schedule"

const now = new Date("2026-11-08T03:00:00Z") // 10:00 giờ Việt Nam

describe("vòng đời bài đăng", () => {
  it("lỗi tạm thời → thử lại giãn dần, hết lượt thì dừng", () => {
    expect(outcomeAfterFailure("RETRYABLE", 1, now)).toEqual({ status: "QUEUED", nextAttemptAt: new Date(now.getTime() + 60_000) })
    expect(outcomeAfterFailure("RETRYABLE", 2, now)).toEqual({ status: "QUEUED", nextAttemptAt: new Date(now.getTime() + 300_000) })
    expect(outcomeAfterFailure("RETRYABLE", MAX_PUBLISH_ATTEMPTS, now)).toEqual({ status: "FAILED" })
  })
  it("lỗi cần người xử lý (hết hạn kết nối, thiếu quyền) → dừng ngay, không thử lại", () => {
    expect(outcomeAfterFailure("NEEDS_ACTION", 1, now)).toEqual({ status: "FAILED" })
  })
  it("huỷ chỉ khi đang chờ; thử lại tay chỉ khi đã dừng vì lỗi; đến hạn theo giờ thử lại", () => {
    expect(canCancel("QUEUED")).toBe(true)
    expect(canCancel("PUBLISHING")).toBe(false)
    expect(canRetry("FAILED")).toBe(true)
    expect(canRetry("PUBLISHED")).toBe(false)
    expect(isDue({ status: "QUEUED", scheduledAt: new Date(now.getTime() - 1), nextAttemptAt: null }, now)).toBe(true)
    expect(isDue({ status: "QUEUED", scheduledAt: new Date(now.getTime() - 1), nextAttemptAt: new Date(now.getTime() + 1) }, now)).toBe(false)
    expect(isDue({ status: "PUBLISHED", scheduledAt: new Date(0), nextAttemptAt: null }, now)).toBe(false)
  })
})

describe("luật nội dung từng nền tảng", () => {
  it("hashtag chuẩn hoá, bỏ trùng; không lặp hashtag đã có trong thân bài", () => {
    expect(normalizeHashtags(["hoa tươi", "#HoaTuoi", "##sinhnhat", " "])).toEqual(["#hoatươi", "#HoaTuoi", "#sinhnhat"])
    expect(composeCaption("Bó hồng đẹp #sinhnhat", ["sinhnhat", "bohong"])).toBe("Bó hồng đẹp #sinhnhat\n\n#bohong")
  })
  it("tiêu đề rút từ dòng đầu, cắt theo trần kênh không cắt giữa từ", () => {
    const long = "Bó hoa hồng đỏ rực rỡ dành tặng người thương nhân dịp sinh nhật thật đặc biệt và ý nghĩa nhất năm nay"
    const t = titleFrom(`${long}\nDòng hai`, "tiktok")
    expect(t.length).toBeLessThanOrEqual(CHANNEL_RULES.tiktok.maxTitle)
    expect(t.endsWith("…")).toBe(true)
    expect(titleFrom("Ngắn gọn\nx", "zalo")).toBe("Ngắn gọn")
  })
  it("Instagram, Zalo, TikTok cần ảnh; Facebook đăng chữ được", () => {
    expect(validatePost({ channel: "facebook", text: "Xin chào", hashtags: [], imageCount: 0 })).toEqual([])
    expect(validatePost({ channel: "instagram", text: "Xin chào", hashtags: [], imageCount: 0 })).toEqual(["Instagram: cần ít nhất 1 ảnh sản phẩm"])
    expect(validatePost({ channel: "facebook", text: "Xin chào", hashtags: [], imageCount: 11 })[0]).toMatch(/tối đa 10 ảnh/)
  })
  it("chặn cứng bài lộ mật khẩu / khoá truy cập; chặn bài rỗng và quá dài", () => {
    expect(validatePost({ channel: "facebook", text: "Đăng nhập mật khẩu: abc123", hashtags: [], imageCount: 0 })[0]).toMatch(/mật khẩu hoặc khoá/)
    expect(validatePost({ channel: "facebook", text: "token EAAGabcdefghijklmnopqrstuvwxyz123", hashtags: [], imageCount: 0 })).toHaveLength(1)
    expect(validatePost({ channel: "instagram", text: " ", hashtags: [], imageCount: 1 })).toEqual(["Instagram: bài chưa có nội dung"])
    expect(validatePost({ channel: "instagram", text: "x".repeat(2300), hashtags: [], imageCount: 1 })[0]).toMatch(/tối đa 2200/)
  })
})

describe("giờ đăng", () => {
  it("tự lên lịch: khung giờ vàng gần nhất (11:30 hoặc 20:00 giờ Việt Nam), cách ít nhất 15 phút", () => {
    expect(nextGoldenSlot(now).toISOString()).toBe("2026-11-08T04:30:00.000Z") // 11:30 VN
    expect(nextGoldenSlot(new Date("2026-11-08T04:20:00Z")).toISOString()).toBe("2026-11-08T13:00:00.000Z") // 20:00 VN
    expect(nextGoldenSlot(new Date("2026-11-08T13:30:00Z")).toISOString()).toBe("2026-11-09T04:30:00.000Z") // hôm sau
    expect(nextGoldenSlot(now).getTime() - now.getTime()).toBeGreaterThanOrEqual(MIN_LEAD_MS)
  })
  it("đăng ngay: cùng lúc; hẹn giờ: giãn 10 phút; giờ đã qua / quá xa → báo lỗi", () => {
    expect(planTimes({ kind: "NOW" }, 2, now)).toEqual({ times: [now, now] })
    const at = new Date(now.getTime() + 3_600_000)
    expect(planTimes({ kind: "AT", at }, 2, now)).toEqual({ times: [at, new Date(at.getTime() + 600_000)] })
    expect(planTimes({ kind: "AT", at: new Date(now.getTime() - 3_600_000) }, 1, now)).toEqual({ error: "Giờ hẹn đã qua — chọn giờ khác" })
    expect(planTimes({ kind: "AT", at: new Date(now.getTime() + 61 * 86_400_000) }, 1, now)).toEqual({ error: "Chỉ hẹn trong vòng 60 ngày tới" })
  })
})
