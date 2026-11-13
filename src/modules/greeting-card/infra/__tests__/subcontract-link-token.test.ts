import { describe, expect, it } from "vitest"

import {
  SUBCONTRACT_TOKEN_TTL_MS,
  signSubcontractBranchToken,
  subcontractBranchUrl,
  verifySubcontractBranchToken,
} from "../subcontract-link-token"

const NOW = Date.UTC(2026, 9, 21, 8, 0, 0)

describe("token link Thẻ Gia Công", () => {
  const token = signSubcontractBranchToken("org-a", "DH261021-ABCD1234", "branch-1", NOW)

  it("đúng đơn + chi nhánh + còn hạn: trả về tổ chức trong token", () => {
    expect(verifySubcontractBranchToken("DH261021-ABCD1234", "branch-1", token, NOW + 1000)).toBe("org-a")
  })

  it("chi nhánh khác, mã đơn khác, thiếu token: từ chối", () => {
    expect(verifySubcontractBranchToken("DH261021-ABCD1234", "branch-2", token, NOW)).toBeNull()
    expect(verifySubcontractBranchToken("DH261021-0001", "branch-1", token, NOW)).toBeNull()
    expect(verifySubcontractBranchToken("DH261021-ABCD1234", "branch-1", null, NOW)).toBeNull()
    expect(verifySubcontractBranchToken("DH261021-ABCD1234", "", token, NOW)).toBeNull()
  })

  it("đổi tổ chức hoặc hạn trong token: chữ ký không còn khớp", () => {
    const [, exp, sig] = token.split(".")
    expect(verifySubcontractBranchToken("DH261021-ABCD1234", "branch-1", `org-b.${exp}.${sig}`, NOW)).toBeNull()
    const later = (NOW + SUBCONTRACT_TOKEN_TTL_MS * 2).toString(36)
    expect(verifySubcontractBranchToken("DH261021-ABCD1234", "branch-1", `org-a.${later}.${sig}`, NOW)).toBeNull()
  })

  it("hết hạn: từ chối", () => {
    expect(
      verifySubcontractBranchToken("DH261021-ABCD1234", "branch-1", token, NOW + SUBCONTRACT_TOKEN_TTL_MS + 1)
    ).toBeNull()
  })

  it("link chi nhánh mang token xác minh được", () => {
    const url = new URL(
      subcontractBranchUrl({
        baseUrl: "https://app.vi-du.test",
        organizationId: "org-a",
        orderCode: "DH261021-ABCD1234",
        branchId: "branch-1",
        action: "upload_qc",
      })
    )
    expect(url.pathname).toBe("/subcontract/DH261021-ABCD1234")
    expect(url.searchParams.get("branch")).toBe("branch-1")
    expect(url.searchParams.get("action")).toBe("upload_qc")
    expect(verifySubcontractBranchToken("DH261021-ABCD1234", "branch-1", url.searchParams.get("t"))).toBe("org-a")
  })
})
