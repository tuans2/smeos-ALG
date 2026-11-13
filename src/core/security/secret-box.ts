import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto"

/**
 * Mã hoá bí mật lưu trong DB (thông tin đăng nhập nhà cung cấp ngoài):
 * AES-256-GCM, khoá dẫn xuất (HKDF-SHA256) từ `INTEGRATION_TOKEN_SECRET`
 * theo từng mục đích (`purpose`) — lộ một loại bản mã không giúp giải loại khác.
 * Định dạng: `v1.<iv>.<tag>.<ciphertext>` (base64url).
 */

/** Salt dẫn xuất khoá hiện hành (ALG, 12/11/2026). */
const SALT = "alg-secret-box"
/**
 * Salt cũ — chỉ để GIẢI bản mã đã lưu trước khi đổi tên (smeOS, rồi FloraOS). Không bao giờ dùng để mã hoá.
 * Xoá một salt khỏi đây chỉ khi chắc không còn bản mã nào dùng nó, nếu không bí mật đó không mở được nữa.
 */
const LEGACY_SALTS = ["smeos-secret-box", "floraos-secret-box"] as const

function keyFor(purpose: string, salt: string): Buffer {
  const master = process.env["INTEGRATION_TOKEN_SECRET"]
  if (!master || master.length < 16) throw new Error("Thiếu INTEGRATION_TOKEN_SECRET để mã hoá bí mật tích hợp")
  return Buffer.from(hkdfSync("sha256", master, salt, purpose, 32))
}

export function sealSecret(plaintext: string, purpose: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", keyFor(purpose, SALT), iv)
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".")
}

/** Giải mã; bản mã hỏng/sai khoá/sai mục đích → ném lỗi (GCM xác thực toàn vẹn). Thử salt hiện hành rồi lần lượt salt cũ. */
export function openSecret(sealed: string, purpose: string): string {
  const [version, iv, tag, body] = sealed.split(".")
  if (version !== "v1" || !iv || !tag || !body) throw new Error("Bản mã bí mật không hợp lệ")

  let lastError: unknown
  for (const salt of [SALT, ...LEGACY_SALTS]) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", keyFor(purpose, salt), Buffer.from(iv, "base64url"))
      decipher.setAuthTag(Buffer.from(tag, "base64url"))
      return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8")
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}
