import { describe, expect, it } from "vitest"
import { startInstantTrial } from "./instant-trial"

describe("Luồng dùng thử tức thì (Instant Sandbox Trial)", () => {
  it("từ chối khi email không đúng định dạng", async () => {
    await expect(
      startInstantTrial({
        name: "Nguyễn Văn A",
        phone: "0901234567",
        email: "khong-hop-le",
        industryKey: "FNB",
      })
    ).rejects.toThrow()
  })

  it("từ chối khi số điện thoại quá ngắn hoặc thiếu", async () => {
    await expect(
      startInstantTrial({
        name: "Nguyễn Văn A",
        phone: "123",
        email: "an@example.com",
        industryKey: "FLORAL",
      })
    ).rejects.toThrow()
  })
})
