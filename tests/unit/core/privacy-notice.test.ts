import { afterEach, describe, expect, it, vi } from "vitest"
import { isPrivacyNoticeEnabled } from "@/lib/privacy-notice"

describe("D13 — dòng thông báo dữ liệu cá nhân mặc định tắt", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("tắt khi chưa cấu hình", () => {
    vi.stubEnv("NEXT_PUBLIC_PRIVACY_NOTICE_ENABLED", "")
    expect(isPrivacyNoticeEnabled()).toBe(false)
  })

  it("chỉ bật khi đúng giá trị true", () => {
    vi.stubEnv("NEXT_PUBLIC_PRIVACY_NOTICE_ENABLED", "1")
    expect(isPrivacyNoticeEnabled()).toBe(false)
    vi.stubEnv("NEXT_PUBLIC_PRIVACY_NOTICE_ENABLED", "true")
    expect(isPrivacyNoticeEnabled()).toBe(true)
  })
})
