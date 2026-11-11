import { createDecipheriv, createECDH, hkdfSync, randomBytes } from "node:crypto"
import { describe, expect, it } from "vitest"

import { encryptPushPayload, generateVapidKeys, vapidAuthorization, vapidKeysValid, vapidTokenValid } from "../web-push-protocol"

/** Giải mã phía trình duyệt, viết độc lập theo RFC 8291 §3.4 + RFC 8188 §2 (đối chiếu chiều ngược lại). */
function decryptAsBrowser(body: Buffer, uaPrivate: Buffer, authSecret: Buffer): Buffer {
  const salt = body.subarray(0, 16)
  const rs = body.readUInt32BE(16)
  const idlen = body.readUInt8(20)
  const asPublic = body.subarray(21, 21 + idlen)
  const ciphertext = body.subarray(21 + idlen)
  expect(rs).toBe(4096)
  const ua = createECDH("prime256v1")
  ua.setPrivateKey(uaPrivate)
  const ecdhSecret = ua.computeSecret(asPublic)
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), ua.getPublicKey(), asPublic])
  const ikm = Buffer.from(hkdfSync("sha256", ecdhSecret, authSecret, keyInfo, 32))
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16))
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12))
  const decipher = createDecipheriv("aes-128-gcm", cek, nonce)
  decipher.setAuthTag(ciphertext.subarray(ciphertext.length - 16))
  const record = Buffer.concat([decipher.update(ciphertext.subarray(0, ciphertext.length - 16)), decipher.final()])
  let end = record.length - 1
  while (end >= 0 && record[end] === 0) end--
  expect(record[end]).toBe(0x02) // dấu bản ghi cuối
  return record.subarray(0, end)
}

const b = (s: string) => Buffer.from(s, "base64url")

/** RFC 8291 Phụ lục A — ví dụ công khai của chuẩn, không phải khoá thật. */
const RFC8291_APPENDIX_A = {
  plaintext: "When I grow up, I want to be a watermelon",
  inputs: [
    "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
    "BTBZMqHH6r4Tts7J_aSIgg",
    "DGv6ra1nlYgDCS1FRnbzlw",
    "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  ] as const,
  body:
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
}

describe("Web Push — mã hoá RFC 8291 (aes128gcm)", () => {
  it("ví dụ chuẩn RFC 8291 Phụ lục A: cùng khoá, salt → đúng từng byte", () => {
    // [khoá công khai trình duyệt, bí mật xác thực, salt, khoá riêng tạm của máy chủ] — giá trị công khai trong RFC
    const [ua, ua16, salt, server] = RFC8291_APPENDIX_A.inputs
    const body = encryptPushPayload({ p256dh: ua, auth: ua16 }, Buffer.from(RFC8291_APPENDIX_A.plaintext), { salt: b(salt), serverPrivateKey: b(server) })
    expect(body.toString("base64url")).toBe(RFC8291_APPENDIX_A.body)
  })

  it("trình duyệt giải mã được tin, mỗi lần mã hoá khác nhau (salt + khoá tạm ngẫu nhiên)", () => {
    const ua = createECDH("prime256v1")
    ua.generateKeys()
    const auth = randomBytes(16)
    const sub = { p256dh: ua.getPublicKey().toString("base64url"), auth: auth.toString("base64url") }
    const msg = Buffer.from(JSON.stringify({ title: "Nhắc lịch giao", message: "Đơn #DH-1 sắp đến giờ giao", url: "/dieu-phoi" }))
    const one = encryptPushPayload(sub, msg)
    const two = encryptPushPayload(sub, msg)
    expect(one.equals(two)).toBe(false)
    expect(decryptAsBrowser(one, ua.getPrivateKey(), auth).equals(msg)).toBe(true)
    expect(decryptAsBrowser(two, ua.getPrivateKey(), auth).equals(msg)).toBe(true)
  })

  it("khoá thiết bị sai độ dài hoặc nội dung quá dài → báo lỗi, không gửi", () => {
    expect(() => encryptPushPayload({ p256dh: "AAAA", auth: "BBBB" }, Buffer.from("x"))).toThrow()
    const ua = createECDH("prime256v1")
    ua.generateKeys()
    const sub = { p256dh: ua.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") }
    expect(() => encryptPushPayload(sub, Buffer.alloc(5000))).toThrow("quá dài")
  })
})

describe("Web Push — VAPID (RFC 8292)", () => {
  it("khoá sinh ra hợp lệ; khoá lệch cặp bị phát hiện", () => {
    const k = generateVapidKeys()
    expect(vapidKeysValid(k.publicKey, k.privateKey)).toBe(true)
    expect(vapidKeysValid(generateVapidKeys().publicKey, k.privateKey)).toBe(false)
    expect(vapidKeysValid("abc", "def")).toBe(false)
  })

  it("header Authorization: JWT ES256 ký đúng, aud là gốc của endpoint, hạn 12 giờ", () => {
    const k = { ...generateVapidKeys(), subject: "mailto:van-hanh@example.com" }
    const now = Date.UTC(2026, 10, 11, 8, 0, 0)
    const header = vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc", k, now)
    const m = /^vapid t=([^,]+), k=(.+)$/.exec(header)!
    expect(m[2]).toBe(k.publicKey)
    expect(vapidTokenValid(m[1]!, k.publicKey)).toBe(true)
    expect(vapidTokenValid(m[1]!, generateVapidKeys().publicKey)).toBe(false)
    const payload = JSON.parse(Buffer.from(m[1]!.split(".")[1]!, "base64url").toString())
    expect(payload).toEqual({ aud: "https://fcm.googleapis.com", exp: now / 1000 + 12 * 3600, sub: "mailto:van-hanh@example.com" })
  })
})
