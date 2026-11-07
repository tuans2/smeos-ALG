import { describe, expect, it } from "vitest"

import {
  decryptPii, encryptPii, newDataKey, normalizePhoneForHash, phoneHash, phoneLast4, piiKeyVersion, piiMasterKey, unwrapDataKey,
} from "../pii-cipher"

const master = Buffer.alloc(32, 7)

/** ADR-014 P-5a: mã hoá cột dữ liệu cá nhân — AES-256-GCM, khoá dữ liệu theo tổ chức bọc bằng khoá chủ. */
describe("pii-cipher", () => {
  it("mã hoá rồi giải mã đúng; bản mã khác nhau mỗi lần; sửa một ký tự → không giải được", () => {
    const { key } = newDataKey(master)
    const a = encryptPii(key, 1, "0912 345 678")
    const b = encryptPii(key, 1, "0912 345 678")
    expect(a).not.toBe(b)
    expect(a).not.toContain("0912")
    expect(decryptPii(key, a)).toBe("0912 345 678")
    expect(piiKeyVersion(a)).toBe(1)
    const tampered = a.slice(0, -2) + (a.endsWith("A") ? "B" : "A") + a.slice(-1)
    expect(() => decryptPii(key, tampered)).toThrow()
    expect(() => decryptPii(newDataKey(master).key, a)).toThrow() // khoá của tổ chức khác
  })

  it("khoá dữ liệu lưu dạng bọc; mở bằng đúng khoá chủ", () => {
    const { key, wrapped } = newDataKey(master)
    expect(wrapped.startsWith("v1.")).toBe(true)
    expect(unwrapDataKey(master, wrapped).equals(key)).toBe(true)
    expect(() => unwrapDataKey(Buffer.alloc(32, 8), wrapped)).toThrow()
  })

  it("băm SĐT: cùng số (mọi cách viết) cùng băm trong một tổ chức, khác tổ chức thì khác; 4 số cuối", () => {
    expect(normalizePhoneForHash("+84 912.345.678")).toBe("0912345678")
    expect(normalizePhoneForHash("84912345678")).toBe("0912345678")
    expect(normalizePhoneForHash("0912-345-678")).toBe("0912345678")
    expect(normalizePhoneForHash("  ")).toBeNull()
    const h = phoneHash(master, "org-a", "0912345678")
    expect(phoneHash(master, "org-a", "+84912345678")).toBe(h)
    expect(phoneHash(master, "org-b", "0912345678")).not.toBe(h)
    expect(h).not.toContain("345678")
    expect(phoneLast4("0912 345 678")).toBe("5678")
    expect(phoneLast4("12")).toBeNull()
  })

  it("khoá chủ: biến 32 byte base64; sai độ dài → lỗi; production thiếu biến → chưa mã hoá; dev dẫn xuất từ SESSION_SECRET", () => {
    expect(piiMasterKey({ PII_ENCRYPTION_KEY: master.toString("base64") } as unknown as NodeJS.ProcessEnv)?.equals(master)).toBe(true)
    expect(() => piiMasterKey({ PII_ENCRYPTION_KEY: "ngan-qua" } as unknown as NodeJS.ProcessEnv)).toThrow(/32 byte/)
    expect(piiMasterKey({ NODE_ENV: "production", SESSION_SECRET: "x".repeat(32) } as unknown as NodeJS.ProcessEnv)).toBeNull()
    const dev = piiMasterKey({ NODE_ENV: "test", SESSION_SECRET: "x".repeat(32) } as unknown as NodeJS.ProcessEnv)
    expect(dev?.length).toBe(32)
  })
})
