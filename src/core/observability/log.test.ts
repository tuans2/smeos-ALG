import { describe, expect, it } from "vitest"

import { laKhoaCam } from "./log"

describe("lọc khoá nhạy cảm khỏi log", () => {
  it("lọc cả khoá ghép chứa số điện thoại, địa chỉ, mật khẩu", () => {
    for (const key of ["phone", "shipperPhone", "recipientPhone", "customer_phone", "deliveryAddress", "newPassword", "clientSecret", "token"]) {
      expect(laKhoaCam(key)).toBe(true)
    }
  })

  it("giữ khoá vận hành bình thường", () => {
    for (const key of ["orderCode", "organizationId", "branchId", "tokensIn", "status"]) {
      expect(laKhoaCam(key)).toBe(false)
    }
  })
})
