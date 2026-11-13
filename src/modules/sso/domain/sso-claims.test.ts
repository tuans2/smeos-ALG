import { describe, expect, it } from "vitest"

import { isSsoClaimsExpired, ssoClaimsFor, SSO_TOKEN_TTL_SECONDS } from "./sso-claims"

const now = new Date("2026-09-10T00:00:00.000Z")

describe("nội dung JWT phiên liên-app", () => {
  it("iat/exp tính đúng theo giây, cách nhau đúng TTL", () => {
    const claims = ssoClaimsFor({ userId: "u1", organizationId: "org1", email: "a@b.com", now })
    expect(claims.iat).toBe(Math.floor(now.getTime() / 1000))
    expect(claims.exp).toBe(claims.iat + SSO_TOKEN_TTL_SECONDS)
  })

  it("giữ nguyên userId/organizationId/email vào đúng tên trường sub/org/email", () => {
    const claims = ssoClaimsFor({ userId: "u1", organizationId: "org1", email: "a@b.com", now })
    expect(claims.sub).toBe("u1")
    expect(claims.org).toBe("org1")
    expect(claims.email).toBe("a@b.com")
  })

  it("tổ chức null (phiên chưa chọn tổ chức) giữ nguyên null, không đổi thành tổ chức mặc định", () => {
    const claims = ssoClaimsFor({ userId: "u1", organizationId: null, email: null, now })
    expect(claims.org).toBeNull()
  })

  it("chưa tới exp thì chưa hết hạn", () => {
    const claims = ssoClaimsFor({ userId: "u1", organizationId: null, email: null, now })
    const justBefore = new Date((claims.exp - 1) * 1000)
    expect(isSsoClaimsExpired(claims, justBefore)).toBe(false)
  })

  it("đúng hoặc qua exp thì hết hạn", () => {
    const claims = ssoClaimsFor({ userId: "u1", organizationId: null, email: null, now })
    const atExpiry = new Date(claims.exp * 1000)
    expect(isSsoClaimsExpired(claims, atExpiry)).toBe(true)
  })
})
