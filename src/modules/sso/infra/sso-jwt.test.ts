import { describe, expect, it } from "vitest"

import type { SsoClaims } from "../domain/sso-claims"

import { signSsoToken, verifySsoToken } from "./sso-jwt"

const claims: SsoClaims = { sub: "u1", org: "org1", email: "a@b.com", iat: 1000, exp: 2000 }

describe("JWT phiên liên-app", () => {
  it("ký rồi xác minh lại đúng ra đúng nội dung ban đầu", () => {
    const token = signSsoToken(claims)
    const verified = verifySsoToken(token, new Date(1500 * 1000))
    expect(verified).toEqual(claims)
  })

  it("đúng hình dạng JWT chuẩn — ba phần cách nhau bởi dấu chấm", () => {
    const token = signSsoToken(claims)
    expect(token.split(".")).toHaveLength(3)
  })

  it("hết hạn (now >= exp) thì từ chối", () => {
    const token = signSsoToken(claims)
    expect(verifySsoToken(token, new Date(2000 * 1000))).toBeNull()
  })

  it("chữ ký bị sửa thì từ chối", () => {
    const token = signSsoToken(claims)
    const [header, payload] = token.split(".")
    const tampered = `${header}.${payload}.aW52YWxpZC1zaWduYXR1cmU`
    expect(verifySsoToken(tampered, new Date(1500 * 1000))).toBeNull()
  })

  it("payload bị sửa (không ký lại) thì từ chối — chữ ký không còn khớp", () => {
    const token = signSsoToken(claims)
    const [header, , signature] = token.split(".")
    const forgedPayload = Buffer.from(
      JSON.stringify({ ...claims, org: "org-khac" })
    ).toString("base64url")
    const tampered = `${header}.${forgedPayload}.${signature}`
    expect(verifySsoToken(tampered, new Date(1500 * 1000))).toBeNull()
  })

  it("hình dạng sai (không đủ ba phần) thì từ chối", () => {
    expect(verifySsoToken("chi-mot-doan", new Date(1500 * 1000))).toBeNull()
  })

  it("chuỗi rác bất kỳ thì từ chối, không ném lỗi", () => {
    expect(verifySsoToken("a.b.c", new Date(1500 * 1000))).toBeNull()
  })
})
