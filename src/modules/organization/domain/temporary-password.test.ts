import { randomBytes } from "node:crypto"
import { describe, expect, it } from "vitest"
import { MIN_PASSWORD_LENGTH } from "./credentials"
import { generateTemporaryPassword, TEMPORARY_PASSWORD_LENGTH } from "./temporary-password"

describe("generateTemporaryPassword", () => {
  it("đủ 12 ký tự, đạt độ dài tối thiểu, không có ký tự dễ đọc nhầm", () => {
    for (let i = 0; i < 200; i++) {
      const p = generateTemporaryPassword((n) => randomBytes(n))
      expect(p).toHaveLength(TEMPORARY_PASSWORD_LENGTH)
      expect(p.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH)
      expect(p).not.toMatch(/[0O1lI]/)
    }
  })

  it("bỏ byte lệch phân phối (≥ 224) thay vì dùng — nguồn toàn byte lệch thì đợi byte hợp lệ", () => {
    let call = 0
    const p = generateTemporaryPassword((n) => (call++ === 0 ? new Uint8Array(n).fill(250) : new Uint8Array(n).fill(0)))
    expect(p).toBe("A".repeat(TEMPORARY_PASSWORD_LENGTH))
  })
})
