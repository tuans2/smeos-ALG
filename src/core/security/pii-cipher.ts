import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto"

/**
 * ADR-014 D-P3, bước P-5a (PO duyệt 07/11/2026): mã hoá cột dữ liệu cá nhân ở tầng ứng dụng. AES-256-GCM qua `node:crypto`.
 * - Khoá chủ `PII_ENCRYPTION_KEY` (32 byte, base64) chỉ ở biến môi trường; ngoài production thiếu biến thì dẫn xuất khoá
 *   thử từ `SESSION_SECRET` (dev, test, CI). Từ P-5c khoá là bắt buộc: production thiếu biến → `requirePiiMasterKey`
 *   ném lỗi ở lệnh đầu tiên ghi, đọc bản mã hoặc tra cứu dữ liệu cá nhân.
 * - Mỗi tổ chức một khoá dữ liệu ngẫu nhiên, lưu ở `tenant_data_keys` dạng đã bọc bằng khoá chủ.
 * - Bản mã: `pii1.<phiên bản khoá>.<iv>.<tag>.<ct>` (base64url).
 * - `phoneHash`: HMAC-SHA256 số đã chuẩn hoá, khoá dẫn xuất (HKDF) từ khoá chủ theo tổ chức — khớp đúng số, không lộ số.
 */

const PREFIX = "pii1"

export function piiMasterKey(environment: NodeJS.ProcessEnv = process.env): Buffer | null {
  const raw = environment["PII_ENCRYPTION_KEY"]?.trim()
  if (raw) {
    const key = Buffer.from(raw, "base64")
    if (key.length !== 32) throw new Error("PII_ENCRYPTION_KEY phải là 32 byte mã base64 (openssl rand -base64 32)")
    return key
  }
  if (environment["NODE_ENV"] === "production") return null
  const dev = environment["SESSION_SECRET"]
  if (!dev) return null
  return Buffer.from(hkdfSync("sha256", dev, "smeos-pii-dev-key", "pii-master", 32))
}

export class PiiKeyRequiredError extends Error {
  constructor() {
    super("Chưa đặt PII_ENCRYPTION_KEY — không ghi/đọc được dữ liệu cá nhân (runbook vận hành §14)")
  }
}

/** Khoá chủ, bắt buộc từ P-5c (dữ liệu cá nhân chỉ còn dạng mã). */
export function requirePiiMasterKey(environment: NodeJS.ProcessEnv = process.env): Buffer {
  const key = piiMasterKey(environment)
  if (!key) throw new PiiKeyRequiredError()
  return key
}

/** Chuỗi có dạng bản mã `pii1.<phiên bản>.…`. */
export function isPiiCiphertext(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(`${PREFIX}.`) && piiKeyVersion(value) !== null
}

function seal(key: Buffer, plaintext: Buffer): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".")
}

function open(key: Buffer, iv: string, tag: string, body: string): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"))
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()])
}

/** Khoá dữ liệu mới (32 byte) và dạng đã bọc để lưu CSDL. */
export function newDataKey(master: Buffer): { key: Buffer; wrapped: string } {
  const key = randomBytes(32)
  return { key, wrapped: `v1.${seal(master, key)}` }
}

export function unwrapDataKey(master: Buffer, wrapped: string): Buffer {
  const [v, iv, tag, body] = wrapped.split(".")
  if (v !== "v1" || !iv || !tag || !body) throw new Error("Khoá dữ liệu đã bọc không hợp lệ")
  return open(master, iv, tag, body)
}

export function encryptPii(key: Buffer, version: number, plaintext: string): string {
  return `${PREFIX}.${version}.${seal(key, Buffer.from(plaintext, "utf8"))}`
}

/** Phiên bản khoá ghi trong bản mã (để chọn khoá giải mã). */
export function piiKeyVersion(sealed: string): number | null {
  const [prefix, version] = sealed.split(".")
  return prefix === PREFIX && version && /^\d+$/.test(version) ? Number(version) : null
}

export function decryptPii(key: Buffer, sealed: string): string {
  const [prefix, , iv, tag, body] = sealed.split(".")
  if (prefix !== PREFIX || !iv || !tag || !body) throw new Error("Bản mã dữ liệu cá nhân không hợp lệ")
  return open(key, iv, tag, body).toString("utf8")
}

/** Số điện thoại chuẩn hoá để băm/so: chỉ chữ số, đầu +84/84 → 0. Chuỗi không có chữ số → null. */
export function normalizePhoneForHash(raw: string | null | undefined): string | null {
  if (!raw) return null
  let digits = raw.replace(/\D/g, "")
  if (raw.trim().startsWith("+84") || (digits.startsWith("84") && digits.length === 11)) digits = `0${digits.slice(2)}`
  return digits || null
}

export function phoneHash(master: Buffer, organizationId: string, raw: string | null | undefined): string | null {
  const phone = normalizePhoneForHash(raw)
  if (!phone) return null
  const key = Buffer.from(hkdfSync("sha256", master, "smeos-pii-phone-hash", organizationId, 32))
  return createHmac("sha256", key).update(phone).digest("base64url")
}

export function phoneLast4(raw: string | null | undefined): string | null {
  const phone = normalizePhoneForHash(raw)
  return phone && phone.length >= 4 ? phone.slice(-4) : null
}
