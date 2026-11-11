import { describe, expect, it } from "vitest"

import { isAllowedPushEndpoint, webPushMessage, webPushUrgency } from "./web-push-rules"

describe("Web Push — luật thuần (4.30)", () => {
  it("chỉ nhận endpoint https của dịch vụ đẩy thật (chặn SSRF tới địa chỉ nội bộ)", () => {
    for (const ok of [
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://web.push.apple.com/QGx",
      "https://wns2-sg2p.notify.windows.com/w/?token=abc",
    ]) expect(isAllowedPushEndpoint(ok), ok).toBe(true)
    for (const bad of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://fcm.googleapis.com:8443/x",
      "https://user@fcm.googleapis.com/x",
      "https://169.254.169.254/latest/meta-data",
      "https://localhost/x",
      "https://fcm.googleapis.com.evil.example/x",
      "https://evilpush.apple.com.example/x",
      "khong-phai-url",
    ]) expect(isAllowedPushEndpoint(bad), bad).toBe(false)
  })

  it("nội dung gửi service worker: chỉ link tương đối trong ứng dụng, cắt ngắn", () => {
    const msg = (deepLink?: string) => JSON.parse(webPushMessage({ title: "T", message: "M".repeat(900), deepLink, eventKey: "E" }))
    expect(msg("/dieu-phoi")).toMatchObject({ url: "/dieu-phoi", tag: "E" })
    expect(msg("//evil.example").url).toBe("/")
    expect(msg("https://evil.example").url).toBe("/")
    expect(msg(undefined).message.length).toBe(600)
  })

  it("tin khẩn đi với Urgency: high", () => {
    expect(webPushUrgency("URGENT")).toBe("high")
    expect(webPushUrgency("NORMAL")).toBe("normal")
    expect(webPushUrgency(undefined)).toBe("normal")
  })
})
