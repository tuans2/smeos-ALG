import { createHash } from "node:crypto"
import { describe, expect, it, vi } from "vitest"
import { extractLinkCode, handleZaloOaEvent, isFreshEvent, verifyZaloSignature } from "../zalo-oa-link"

const mac = (appId: string, body: string, ts: string, key: string) =>
  "mac=" + createHash("sha256").update(appId + body + ts + key).digest("hex")

describe("webhook Zalo OA — liên kết chi nhánh", () => {
  const body = '{"event_name":"user_send_text"}'

  it("chữ ký đúng → hợp lệ; sai khoá / sửa thân / thiếu cấu hình → từ chối", () => {
    const ok = { rawBody: body, header: mac("app", body, "1", "k"), appId: "app", oaSecretKey: "k", timestamp: "1" }
    expect(verifyZaloSignature(ok)).toBe(true)
    expect(verifyZaloSignature({ ...ok, oaSecretKey: "khac" })).toBe(false)
    expect(verifyZaloSignature({ ...ok, rawBody: body + " " })).toBe(false)
    expect(verifyZaloSignature({ ...ok, oaSecretKey: undefined })).toBe(false)
    expect(verifyZaloSignature({ ...ok, header: null })).toBe(false)
  })

  it("sự kiện quá 10 phút bị coi là phát lại", () => {
    const now = 1_700_000_000_000
    expect(isFreshEvent(String(now - 60_000), now)).toBe(true)
    expect(isFreshEvent(String(now - 11 * 60_000), now)).toBe(false)
    expect(isFreshEvent("abc", now)).toBe(false)
  })

  it("lấy mã liên kết trong tin nhắn (không phân biệt hoa thường)", () => {
    expect(extractLinkCode("mã của tôi: zlabcd2345 nhé")).toBe("ZLABCD2345")
    expect(extractLinkCode("xin chào")).toBeNull()
  })

  it("mã đúng → liên kết và trả lời; mã sai → trả lời hướng dẫn; tin khác → bỏ qua", async () => {
    const reply = vi.fn()
    const linkZaloUser = vi.fn(async (code: string) => (code === "ZLABCD2345" ? { organizationId: "o", branchName: "Q1" } : null))

    expect(await handleZaloOaEvent({ event_name: "user_send_text", sender: { id: "u1" }, message: { text: "ZLABCD2345" } }, { linkZaloUser, reply })).toBe("LINKED")
    expect(linkZaloUser).toHaveBeenCalledWith("ZLABCD2345", "u1")
    expect(reply.mock.calls[0]?.[1]).toContain("Q1")

    expect(await handleZaloOaEvent({ event_name: "user_send_text", sender: { id: "u1" }, message: { text: "ZLZZZZ2222" } }, { linkZaloUser, reply })).toBe("UNKNOWN_CODE")
    expect(await handleZaloOaEvent({ event_name: "follow", sender: { id: "u1" } }, { linkZaloUser, reply })).toBe("IGNORED")
  })
})
