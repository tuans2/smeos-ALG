import { describe, expect, it } from "vitest"

import { isSameShipper } from "@/modules/coordinator/domain/shipper-match"
import { canonicalVnPhone } from "./staff-phone"

describe("số điện thoại nhân viên (checklist ALG 4.5)", () => {
  it("chuẩn hoá về dạng 0xxxxxxxxx; số sai → null", () => {
    expect(canonicalVnPhone("+84 933 221 100")).toBe("0933221100")
    expect(canonicalVnPhone("0933.221.100")).toBe("0933221100")
    expect(canonicalVnPhone("12ab")).toBeNull()
    expect(canonicalVnPhone(null)).toBeNull()
  })

  it("gắn shipper khi hai số trùng sau chuẩn hoá; số trống không bao giờ trùng", () => {
    expect(isSameShipper("84933221100", "0933 221 100")).toBe(true)
    expect(isSameShipper("0933221100", "0911000111")).toBe(false)
    expect(isSameShipper(null, null)).toBe(false)
  })
})
