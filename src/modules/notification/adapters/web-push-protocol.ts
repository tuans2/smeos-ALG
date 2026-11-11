/**
 * Giao thức Web Push tự viết bằng `node:crypto` (checklist 4.30) — không thêm thư viện ngoài.
 *
 * - Mã hoá nội dung: RFC 8291 (Message Encryption for Web Push) trên RFC 8188 `aes128gcm`, một bản ghi.
 * - Xác thực máy chủ ứng dụng: RFC 8292 (VAPID), JWT ES256, header `Authorization: vapid t=…, k=…`.
 *
 * Kiểm: `web-push-protocol.test.ts` giải mã lại theo phía trình duyệt và đối chiếu chữ ký bằng khoá công khai.
 */
import { createECDH, createCipheriv, createPrivateKey, createPublicKey, hkdfSync, randomBytes, sign, verify } from "node:crypto"

export interface PushSubscriptionKeys {
  endpoint: string
  /** Khoá công khai P-256 của trình duyệt, base64url, 65 byte không nén. */
  p256dh: string
  /** Bí mật xác thực 16 byte của trình duyệt, base64url. */
  auth: string
}

export interface VapidKeys {
  /** Khoá công khai P-256, base64url, 65 byte không nén (trình duyệt dùng làm `applicationServerKey`). */
  publicKey: string
  /** Khoá riêng P-256, base64url, 32 byte. */
  privateKey: string
  /** `mailto:` hoặc `https:` để dịch vụ đẩy liên hệ khi cần. */
  subject: string
}

const RECORD_SIZE = 4096
const b64u = (buf: Buffer) => buf.toString("base64url")
const fromB64u = (s: string) => Buffer.from(s, "base64url")

/** Sinh cặp khoá VAPID mới (tầng Mẹ tạo một lần). */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  const ecdh = createECDH("prime256v1")
  ecdh.generateKeys()
  return { publicKey: b64u(ecdh.getPublicKey()), privateKey: b64u(ecdh.getPrivateKey()) }
}

/** Kiểm cặp khoá VAPID khớp nhau và đúng độ dài — tránh lưu khoá hỏng rồi mọi lần gửi đều bị từ chối. */
export function vapidKeysValid(publicKey: string, privateKey: string): boolean {
  try {
    const pub = fromB64u(publicKey)
    const priv = fromB64u(privateKey)
    if (pub.length !== 65 || pub[0] !== 0x04 || priv.length !== 32) return false
    const ecdh = createECDH("prime256v1")
    ecdh.setPrivateKey(priv)
    return ecdh.getPublicKey().equals(pub)
  } catch {
    return false
  }
}

function vapidSigningKey(keys: VapidKeys) {
  const pub = fromB64u(keys.publicKey)
  return createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: keys.privateKey, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    format: "jwk",
  })
}

/** Khoá công khai VAPID dạng KeyObject — dùng trong test để kiểm chữ ký. */
export function vapidVerifyKey(publicKey: string) {
  const pub = fromB64u(publicKey)
  return createPublicKey({ key: { kty: "EC", crv: "P-256", x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: "jwk" })
}

/** Header `Authorization` theo RFC 8292; `aud` là gốc (scheme + host) của endpoint, hạn 12 giờ. */
export function vapidAuthorization(endpoint: string, keys: VapidKeys, now = Date.now()): string {
  const header = b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })))
  const payload = b64u(Buffer.from(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: keys.subject })))
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), { key: vapidSigningKey(keys), dsaEncoding: "ieee-p1363" })
  return `vapid t=${header}.${payload}.${b64u(signature)}, k=${keys.publicKey}`
}

/** Kiểm JWT VAPID (cho test và chẩn đoán). */
export function vapidTokenValid(token: string, publicKey: string): boolean {
  const [h, p, s] = token.split(".")
  if (!h || !p || !s) return false
  return verify("sha256", Buffer.from(`${h}.${p}`), { key: vapidVerifyKey(publicKey), dsaEncoding: "ieee-p1363" }, fromB64u(s))
}

/**
 * Mã hoá nội dung cho một thiết bị (RFC 8291 §3.4, RFC 8188 `aes128gcm`, một bản ghi, dấu kết thúc 0x02).
 * `salt` và khoá tạm của máy chủ chỉ truyền vào trong test; bình thường sinh ngẫu nhiên mỗi tin.
 */
export function encryptPushPayload(
  subscription: Pick<PushSubscriptionKeys, "p256dh" | "auth">,
  plaintext: Buffer,
  fixed?: { salt: Buffer; serverPrivateKey: Buffer },
): Buffer {
  const uaPublic = fromB64u(subscription.p256dh)
  const authSecret = fromB64u(subscription.auth)
  if (uaPublic.length !== 65 || authSecret.length !== 16) throw new Error("Khoá thiết bị nhận tin không hợp lệ")
  if (plaintext.length + 1 + 16 > RECORD_SIZE) throw new Error("Nội dung tin đẩy quá dài")

  const ecdh = createECDH("prime256v1")
  if (fixed) ecdh.setPrivateKey(fixed.serverPrivateKey)
  else ecdh.generateKeys()
  const asPublic = ecdh.getPublicKey()
  const sharedSecret = ecdh.computeSecret(uaPublic)
  const salt = fixed?.salt ?? randomBytes(16)

  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic])
  const ikm = Buffer.from(hkdfSync("sha256", sharedSecret, authSecret, keyInfo, 32))
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16))
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12))

  const cipher = createCipheriv("aes-128-gcm", cek, nonce)
  const ciphertext = Buffer.concat([cipher.update(Buffer.concat([plaintext, Buffer.from([0x02])])), cipher.final(), cipher.getAuthTag()])

  const header = Buffer.alloc(16 + 4 + 1)
  salt.copy(header, 0)
  header.writeUInt32BE(RECORD_SIZE, 16)
  header.writeUInt8(asPublic.length, 20)
  return Buffer.concat([header, asPublic, ciphertext])
}
