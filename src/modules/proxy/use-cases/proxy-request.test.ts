/**
 *Proxy use-case test — giải danh tính, dựng header, ánh xạ lỗi.
 *
 * Không gọi HTTP thật: mock adapter `proxyRequest` bằng `vi.mock`, chỉ kiểm
 * logic orchestrate (identity → headers → error mapping). Test xanh trên repo
 * này mới coi là proxy chuyển xong (AGENTS.md).
 */

import { describe, it, expect, vi } from "vitest"

// Mock adapter trước khi import use-case — tránh real HTTP. Dùng
// `importOriginal` để giữ lại `proxyErrorMessage` thật (nó parse JSON error
// từ response sibling), chỉ mock `proxyRequest` (gọi HTTP).
const proxyRequestMock = vi.fn()
vi.mock("../infra/proxy-http-adapter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../infra/proxy-http-adapter")>()
  return {
    ...actual,
    proxyRequest: (...args: unknown[]) => proxyRequestMock(...args),
    ProxyError: class ProxyError extends Error {},
  }
})

import { SSO_HEADER } from "../domain/proxy-rules"
import { readProxyIdentity, buildForwardHeaders, toProxyError, ProxyRouteError } from "./proxy-request"

function mockRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/v1/proxy/api/m04b/x?client=SOCIALFLOW", {
    method: "POST",
    headers,
  })
}

describe("readProxyIdentity", () => {
  it("ưu tiên header SSO khi có cả hai", () => {
    const req = mockRequest({
      [SSO_HEADER]: "jwt-sso",
      authorization: "Bearer token-nen",
    })
    const id = readProxyIdentity(req)
    expect(id).toEqual({ kind: "sso", value: "jwt-sso" })
  })

  it("đọc cookie smeos_sso khi không có header", () => {
    const req = mockRequest({ cookie: "smeos_session=abc; smeos_sso=jwt-cookie" })
    const id = readProxyIdentity(req)
    expect(id).toEqual({ kind: "sso", value: "jwt-cookie" })
  })

  it("vẫn đọc cookie cũ floraos_sso trong giai đoạn chuyển tên", () => {
    expect(readProxyIdentity(mockRequest({ cookie: "floraos_sso=jwt-cu" }))).toEqual({ kind: "sso", value: "jwt-cu" })
    expect(readProxyIdentity(mockRequest({ cookie: "floraos_sso=jwt-cu; smeos_sso=jwt-moi" }))).toEqual({ kind: "sso", value: "jwt-moi" })
  })

  it("fallback sang Authorization Bearer khi không có SSO", () => {
    const req = mockRequest({ authorization: "Bearer my-token" })
    const id = readProxyIdentity(req)
    expect(id).toEqual({ kind: "token", value: "Bearer my-token" })
  })

  it("trả về none khi không có chứng thư nào", () => {
    const req = mockRequest()
    expect(readProxyIdentity(req)).toEqual({ kind: "none" })
  })
})

describe("buildForwardHeaders", () => {
  it("forward SSO header", () => {
    const headers = buildForwardHeaders({
      identity: { kind: "sso", value: "jwt" },
      contentType: "application/json",
      extra: { accept: "application/json" },
    })
    expect(headers["x-floraos-sso"]).toBe("jwt")
    // Tên mới ALG + tên smeOS vẫn gửi kèm cho ứng dụng liên kết chưa cập nhật
    expect(headers["x-alg-sso"]).toBe("jwt")
    expect(headers["x-smeos-sso"]).toBe("jwt")
    expect(headers["content-type"]).toBe("application/json")
    expect(headers["authorization"]).toBeUndefined()
  })

  it("forward Authorization khi token", () => {
    const headers = buildForwardHeaders({
      identity: { kind: "token", value: "Bearer t" },
      contentType: undefined,
      extra: {},
    })
    expect(headers["authorization"]).toBe("Bearer t")
    expect(headers["x-floraos-sso"]).toBeUndefined()
  })

  it("không forward gì khi none", () => {
    const headers = buildForwardHeaders({
      identity: { kind: "none" },
      contentType: undefined,
      extra: {},
    })
    expect(headers["x-floraos-sso"]).toBeUndefined()
    expect(headers["authorization"]).toBeUndefined()
  })
})

describe("toProxyError", () => {
  it("null khi 2xx", () => {
    expect(toProxyError({ status: 200, headers: {}, body: "" }, "SOCIALFLOW")).toBeNull()
    expect(toProxyError({ status: 201, headers: {}, body: "" }, "SOCIALFLOW")).toBeNull()
  })

  it("401 → UNAUTHENTICATED", () => {
    const err = toProxyError({ status: 401, headers: {}, body: "" }, "SOCIALFLOW")
    expect(err).toBeInstanceOf(ProxyRouteError)
    expect(err?.code).toBe("UNAUTHENTICATED")
  })

  it("403 → UNAUTHENTICATED", () => {
    const err = toProxyError({ status: 403, headers: {}, body: "" }, "SOCIALFLOW")
    expect(err?.code).toBe("UNAUTHENTICATED")
  })

  it("404 → NOT_FOUND", () => {
    const err = toProxyError({ status: 404, headers: {}, body: "" }, "SOCIALFLOW")
    expect(err?.code).toBe("NOT_FOUND")
  })

  it("400 → VALIDATION_FAILED", () => {
    const err = toProxyError({ status: 400, headers: {}, body: "" }, "SOCIALFLOW")
    expect(err?.code).toBe("VALIDATION_FAILED")
  })

  it("500 → INTERNAL", () => {
    const err = toProxyError({ status: 500, headers: {}, body: "" }, "SOCIALFLOW")
    expect(err?.code).toBe("INTERNAL")
  })

  it("đọc message từ JSON error", () => {
    const err = toProxyError(
      {
        status: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: { message: "product_id bắt buộc" } }),
      },
      "SOCIALFLOW"
    )
    expect(err?.message).toContain("product_id bắt buộc")
  })
})
describe("callProxyJson (gọi sibling từ mã máy chủ, 25/09/2026)", () => {
  it("POST JSON kèm SSO của người thao tác, trả body JSON đã parse", async () => {
    const { callProxyJson } = await import("./proxy-request")
    const { env } = await import("@/lib/env")
    const prev = env.SOCIALFLOW_URL
    ;(env as { SOCIALFLOW_URL?: string | undefined }).SOCIALFLOW_URL = "http://sf.local:8000"
    proxyRequestMock.mockResolvedValueOnce({ status: 200, headers: { "content-type": "application/json" }, body: '{"result_id":"r-1"}' })
    try {
      const out = await callProxyJson({
        client: "SOCIALFLOW",
        request: mockRequest({ [SSO_HEADER]: "jwt-sso" }),
        method: "POST",
        path: "api/m07/posts",
        json: { product_name: "Bó hoa" },
      })
      expect(out).toEqual({ result_id: "r-1" })
      const call = proxyRequestMock.mock.calls.at(-1)![0] as { path: string; method: string; headers: Record<string, string>; body: string }
      expect(call).toMatchObject({ path: "api/m07/posts", method: "POST", body: '{"product_name":"Bó hoa"}' })
      expect(call.headers["x-floraos-sso"]).toBe("jwt-sso")
      expect(call.headers["content-type"]).toBe("application/json")
    } finally {
      ;(env as { SOCIALFLOW_URL?: string | undefined }).SOCIALFLOW_URL = prev
    }
  })

  it("từ chối đường dẫn ngoài danh sách trắng trước khi gọi mạng", async () => {
    const { callProxyJson } = await import("./proxy-request")
    proxyRequestMock.mockClear()
    await expect(
      callProxyJson({ client: "SOCIALFLOW", request: mockRequest({ [SSO_HEADER]: "jwt" }), method: "POST", path: "api/admin", json: {} })
    ).rejects.toThrow(/danh sách proxy/)
    expect(proxyRequestMock).not.toHaveBeenCalled()
  })

  it("sibling trả lỗi → ném lỗi đã ánh xạ", async () => {
    const { callProxyJson } = await import("./proxy-request")
    const { env } = await import("@/lib/env")
    const prev = env.SOCIALFLOW_URL
    ;(env as { SOCIALFLOW_URL?: string | undefined }).SOCIALFLOW_URL = "http://sf.local:8000"
    proxyRequestMock.mockResolvedValueOnce({ status: 500, headers: {}, body: "" })
    try {
      await expect(
        callProxyJson({ client: "SOCIALFLOW", request: mockRequest({ [SSO_HEADER]: "jwt" }), method: "POST", path: "api/m07/posts", json: {} })
      ).rejects.toThrow(/SOCIALFLOW/)
    } finally {
      ;(env as { SOCIALFLOW_URL?: string | undefined }).SOCIALFLOW_URL = prev
    }
  })
})
