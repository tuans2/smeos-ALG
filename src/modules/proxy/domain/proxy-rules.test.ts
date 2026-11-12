/**
 *Proxy-rules test — luật thuần, không cần CSDL.
 *
 * Bắt buộc theo AGENTS.md: "Luật nghiệp vụ đi kèm test khóa nó. Test xanh trên
 * repo này thì mới coi là chuyển xong."
 */

import { describe, it, expect } from "vitest"
import { requireProxyUrl, isAllowedProxyPath, proxyCapabilityFor, NO_BODY_METHODS, SSO_HEADER, LEGACY_SSO_HEADERS, AUTHORIZATION_HEADER } from "./proxy-rules"
import { AppError } from "@/core/http/errors"

describe("proxy-rules", () => {
  it("requireProxyUrl throw khi thiếu URL", () => {
    expect(() => requireProxyUrl("SOCIALFLOW", undefined)).toThrow(AppError)
    expect(() => requireProxyUrl("LOCALBUDD", undefined)).toThrow(AppError)
  })

  it("requireProxyUrl trả về URL khi có", () => {
    expect(requireProxyUrl("SOCIALFLOW", "http://localhost:8000")).toBe("http://localhost:8000")
    expect(requireProxyUrl("LOCALBUDD", "http://localhost:3000")).toBe("http://localhost:3000")
  })

  it("header constants đúng", () => {
    expect(SSO_HEADER).toBe("x-alg-sso")
    expect(LEGACY_SSO_HEADERS).toEqual(["x-smeos-sso", "x-floraos-sso"])
    expect(AUTHORIZATION_HEADER).toBe("authorization")
  })

  it("NO_BODY_METHODS không có POST/PUT/PATCH", () => {
    expect(NO_BODY_METHODS).toEqual(["GET", "HEAD", "DELETE"])
    expect(NO_BODY_METHODS).not.toContain("POST")
    expect(NO_BODY_METHODS).not.toContain("PUT")
    expect(NO_BODY_METHODS).not.toContain("PATCH")
  })
})

describe("isAllowedProxyPath", () => {
  it("nhận đường dẫn trong danh sách trắng, có hoặc không có / đầu", () => {
    expect(isAllowedProxyPath("SOCIALFLOW", "api/m07/posts")).toBe(true)
    expect(isAllowedProxyPath("SOCIALFLOW", "/api/m07/posts")).toBe(true)
    expect(isAllowedProxyPath("SOCIALFLOW", "api/m07/posts/123/approve")).toBe(true)
    expect(isAllowedProxyPath("SOCIALFLOW", "api/m07/posts/123/schedule")).toBe(true)
  })

  it("chặn api/m07/generate (P27, 25/09/2026: /noi-dung gọi thẳng Content Engine, không qua proxy nữa)", () => {
    expect(isAllowedProxyPath("SOCIALFLOW", "api/m07/generate")).toBe(false)
    expect(isAllowedProxyPath("SOCIALFLOW", "/api/m07/generate")).toBe(false)
    expect(isAllowedProxyPath("SOCIALFLOW", "api/m07")).toBe(false)
  })

  it("từ chối tiền tố lạ, tiền tố dính chữ, và đường dẫn có ..", () => {
    expect(isAllowedProxyPath("SOCIALFLOW", "api/admin")).toBe(false)
    expect(isAllowedProxyPath("SOCIALFLOW", "api/m07postsx/generate")).toBe(false)
    expect(isAllowedProxyPath("SOCIALFLOW", "api/m07/posts/../admin")).toBe(false)
    expect(isAllowedProxyPath("LOCALBUDD", "api/m07/posts")).toBe(false)
  })
})

describe("proxyCapabilityFor — công cụ 54", () => {
  it("ghi vào tài khoản mạng xã hội cần J5; đọc thì không", () => {
    expect(proxyCapabilityFor("SOCIALFLOW", "POST", "api/accounts")).toBe("J5")
    expect(proxyCapabilityFor("SOCIALFLOW", "POST", "/api/accounts/facebook/login")).toBe("J5")
    expect(proxyCapabilityFor("SOCIALFLOW", "DELETE", "api/accounts/facebook")).toBe("J5")
    expect(proxyCapabilityFor("SOCIALFLOW", "GET", "api/accounts")).toBeNull()
    expect(proxyCapabilityFor("SOCIALFLOW", "POST", "api/posts")).toBeNull()
    expect(proxyCapabilityFor("SOCIALFLOW", "POST", "api/accountsX")).toBeNull()
    expect(proxyCapabilityFor("LOCALBUDD", "POST", "api/accounts")).toBeNull()
  })
})
