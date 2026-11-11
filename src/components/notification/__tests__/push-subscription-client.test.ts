import { describe, expect, it } from "vitest"

import { base64UrlToBytes, pushSupport } from "../push-subscription-client"

describe("Web Push phía trình duyệt (4.30)", () => {
  it("khoá base64url → đúng byte cho applicationServerKey", () => {
    const bytes = Uint8Array.from([4, 255, 0, 62, 63, 128])
    const encoded = Buffer.from(bytes).toString("base64url")
    expect(Array.from(base64UrlToBytes(encoded))).toEqual(Array.from(bytes))
  })

  it("trình duyệt không hỗ trợ / đang chặn thông báo", () => {
    expect(pushSupport({ serviceWorker: false, pushManager: true, permission: "default" })).toBe("unsupported")
    expect(pushSupport({ serviceWorker: true, pushManager: true, permission: null })).toBe("unsupported")
    expect(pushSupport({ serviceWorker: true, pushManager: true, permission: "denied" })).toBe("denied")
    expect(pushSupport({ serviceWorker: true, pushManager: true, permission: "default" })).toBe("supported")
  })
})
