import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto"
import { beforeEach, describe, expect, it } from "vitest"
import { openSecret, sealSecret } from "@/core/security/secret-box"
import { CircuitOpenError, resetCircuitBreakers, withCircuitBreaker } from "@/core/http/circuit-breaker"

describe("secret-box", () => {
  beforeEach(() => {
    process.env["INTEGRATION_TOKEN_SECRET"] = "khoa-thu-nghiem-du-dai-1234567890"
  })
  it("mã hoá/giải mã đúng, bản mã khác nhau mỗi lần, sai mục đích hoặc bị sửa thì hỏng", () => {
    const a = sealSecret("bí mật", "zns")
    expect(a).not.toBe(sealSecret("bí mật", "zns"))
    expect(openSecret(a, "zns")).toBe("bí mật")
    expect(() => openSecret(a, "esms")).toThrow()
    const parts = a.split(".")
    parts[3] = Buffer.from("x").toString("base64url")
    expect(() => openSecret(parts.join("."), "zns")).toThrow()
  })

  // Bản mã lưu trước khi đổi tên ALG (12/11/2026) dùng salt cũ — phải còn mở được, nếu không bí mật tích hợp mất
  const sealWithSalt = (plaintext: string, purpose: string, salt: string) => {
    const key = Buffer.from(hkdfSync("sha256", process.env["INTEGRATION_TOKEN_SECRET"]!, salt, purpose, 32))
    const iv = randomBytes(12)
    const c = createCipheriv("aes-256-gcm", key, iv)
    const body = Buffer.concat([c.update(plaintext, "utf8"), c.final()])
    return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), body.toString("base64url")].join(".")
  }

  it("mở được bản mã cũ dùng salt smeos-secret-box và floraos-secret-box", () => {
    expect(openSecret(sealWithSalt("cũ smeOS", "zns", "smeos-secret-box"), "zns")).toBe("cũ smeOS")
    expect(openSecret(sealWithSalt("cũ FloraOS", "zns", "floraos-secret-box"), "zns")).toBe("cũ FloraOS")
  })

  it("bản mã mới dùng salt alg-secret-box", () => {
    const [, iv, tag, body] = sealSecret("mới", "zns").split(".")
    const key = Buffer.from(hkdfSync("sha256", process.env["INTEGRATION_TOKEN_SECRET"]!, "alg-secret-box", "zns", 32))
    const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv!, "base64url"))
    d.setAuthTag(Buffer.from(tag!, "base64url"))
    expect(Buffer.concat([d.update(Buffer.from(body!, "base64url")), d.final()]).toString("utf8")).toBe("mới")
  })
})

describe("withCircuitBreaker", () => {
  beforeEach(() => resetCircuitBreakers())
  it("mở sau N lỗi liên tiếp, đóng lại sau thời gian nghỉ khi gọi thành công", async () => {
    let t = 0
    const clock = () => t
    const fail = () => Promise.reject(new Error("sập"))
    for (let i = 0; i < 3; i++) {
      await expect(withCircuitBreaker("x", fail, { failureThreshold: 3, cooldownMs: 100 }, clock)).rejects.toThrow("sập")
    }
    await expect(withCircuitBreaker("x", () => Promise.resolve(1), { failureThreshold: 3 }, clock)).rejects.toBeInstanceOf(CircuitOpenError)
    t = 200
    await expect(withCircuitBreaker("x", () => Promise.resolve(1), {}, clock)).resolves.toBe(1)
  })
  it("huỷ lời gọi quá thời gian chờ", async () => {
    const slow = (signal: AbortSignal) =>
      new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("timeout"))))
    await expect(withCircuitBreaker("y", slow, { timeoutMs: 20 })).rejects.toThrow("timeout")
  })
})
