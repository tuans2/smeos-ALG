import { createECDH } from "node:crypto"
import { describe, expect, it, vi } from "vitest"

/**
 * Khoá riêng P-256 có byte đầu bằng 0 (~1/256 lần sinh): `ECDH.getPrivateKey()` trả 31 byte.
 * Cố định vô hướng để tái hiện tất định thay vì chờ xác suất.
 */
const SHORT_SCALAR = Buffer.from(`00${"11".repeat(31)}`, "hex")

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>()
  return {
    ...actual,
    createECDH: (curve: string) => {
      const ecdh = actual.createECDH(curve)
      // Chỉ thay sinh khoá ngẫu nhiên; setPrivateKey/getPublicKey vẫn là thật.
      ecdh.generateKeys = (() => {
        ecdh.setPrivateKey(SHORT_SCALAR)
        return ecdh.getPublicKey()
      }) as typeof ecdh.generateKeys
      return ecdh
    },
  }
})

const { generateVapidKeys, vapidAuthorization, vapidKeysValid, vapidTokenValid } = await import("../web-push-protocol")

describe("Web Push — VAPID khi khoá riêng có byte đầu bằng 0", () => {
  it("tiền đề: getPrivateKey trả 31 byte cho vô hướng này", () => {
    const e = createECDH("prime256v1")
    e.generateKeys()
    expect(e.getPrivateKey().length).toBe(31)
  })

  it("khoá sinh ra luôn 32 byte và hợp lệ", () => {
    const k = generateVapidKeys()
    const priv = Buffer.from(k.privateKey, "base64url")
    expect(priv.length).toBe(32)
    expect(priv.equals(SHORT_SCALAR)).toBe(true)
    expect(vapidKeysValid(k.publicKey, k.privateKey)).toBe(true)
  })

  it("khoá 31 byte đã lưu trước bản sửa vẫn được chấp nhận và ký đúng", () => {
    const k = generateVapidKeys()
    const stored31 = SHORT_SCALAR.subarray(1).toString("base64url")
    expect(vapidKeysValid(k.publicKey, stored31)).toBe(true)
    const header = vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc", { publicKey: k.publicKey, privateKey: stored31, subject: "mailto:van-hanh@example.com" })
    const token = /^vapid t=([^,]+), k=/.exec(header)![1]!
    expect(vapidTokenValid(token, k.publicKey)).toBe(true)
  })

  it("khoá riêng dài hơn 32 byte vẫn bị từ chối", () => {
    const k = generateVapidKeys()
    expect(vapidKeysValid(k.publicKey, Buffer.concat([Buffer.alloc(1), SHORT_SCALAR]).toString("base64url"))).toBe(false)
  })
})
