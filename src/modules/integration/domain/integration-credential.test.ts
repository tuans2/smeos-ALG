import { describe, expect, it } from "vitest"

import { readIntegrationCredential, SSO_HEADER } from "./integration-credential"

function headers(entries: Record<string, string>): Headers {
  return new Headers(entries)
}

describe("readIntegrationCredential", () => {
  it("không có header nào thì trả null", () => {
    expect(readIntegrationCredential(headers({}))).toBeNull()
  })

  it("đọc token máy gọi máy từ Authorization: Bearer", () => {
    expect(readIntegrationCredential(headers({ authorization: "Bearer abc123" }))).toEqual({
      kind: "token",
      value: "abc123",
    })
  })

  it("bỏ qua Authorization không phải Bearer", () => {
    expect(readIntegrationCredential(headers({ authorization: "Basic abc123" }))).toBeNull()
  })

  it("cắt khoảng trắng quanh giá trị Bearer", () => {
    expect(readIntegrationCredential(headers({ authorization: "Bearer   abc123   " }))).toEqual({
      kind: "token",
      value: "abc123",
    })
  })

  it("đọc JWT SSO từ header riêng", () => {
    expect(readIntegrationCredential(headers({ [SSO_HEADER]: "a.b.c" }))).toEqual({
      kind: "sso",
      value: "a.b.c",
    })
  })

  it("SSO thắng khi lời gọi mang cả hai — phạm vi hẹp hơn là mặc định an toàn", () => {
    expect(
      readIntegrationCredential(headers({ authorization: "Bearer abc123", [SSO_HEADER]: "a.b.c" }))
    ).toEqual({ kind: "sso", value: "a.b.c" })
  })

  it("header SSO rỗng không che mất token Bearer", () => {
    expect(
      readIntegrationCredential(headers({ authorization: "Bearer abc123", [SSO_HEADER]: "   " }))
    ).toEqual({ kind: "token", value: "abc123" })
  })
})
