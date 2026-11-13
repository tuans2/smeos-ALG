import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetCircuitBreakers } from "@/core/http/circuit-breaker"
import { ZaloOaPlatformClient, type IZaloTokenVault, type ZaloOaTokens } from "../staff-channels/zalo-oa-platform"

const NOW = Date.parse("2026-10-22T10:00:00Z")
const config = { appId: "app", appSecret: "secret", bootstrapRefreshToken: "boot-rt" }

function memoryVault(initial: ZaloOaTokens | null) {
  let stored = initial
  const vault: IZaloTokenVault = {
    read: vi.fn(async () => stored),
    withLock: vi.fn(async (fn) => fn(stored, async (t: ZaloOaTokens) => { stored = t })),
  }
  return { vault, stored: () => stored, set: (t: ZaloOaTokens) => { stored = t } }
}

const fresh = (token = "at-1", rt = "rt-1"): ZaloOaTokens => ({
  accessToken: token, refreshToken: rt, accessTokenExpiresAt: new Date(NOW + 3600_000).toISOString(),
})

type Reply = { url: string; body: unknown }
function fakeFetch(replies: Array<(url: string, init?: RequestInit) => unknown>) {
  const calls: Reply[] = []
  const impl = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body })
    const next = replies.shift()
    if (!next) throw new Error("unexpected call")
    return { ok: true, status: 200, json: async () => next(url, init) } as unknown as Response
  })
  return { impl, calls }
}

const sendOk = () => ({ error: 0, data: { message_id: "m1" } })
const refreshOk = (n: number) => () => ({ access_token: `at-${n}`, refresh_token: `rt-${n}`, expires_in: 90000 })

describe("ZaloOaPlatformClient", () => {
  beforeEach(() => resetCircuitBreakers())

  it("token còn hạn → gửi thẳng, không làm mới", async () => {
    const { vault } = memoryVault(fresh())
    const f = fakeFetch([sendOk])
    const res = await new ZaloOaPlatformClient(vault, config, f.impl, () => NOW).sendText("u1", "xin chào")
    expect(res).toEqual({ sent: true, msgId: "m1" })
    expect(f.calls).toHaveLength(1)
    expect(f.calls[0]?.url).toContain("/oa/message/cs")
  })

  it("kho trống → làm mới bằng refresh token ban đầu, lưu cặp mới", async () => {
    const m = memoryVault(null)
    const f = fakeFetch([refreshOk(2), sendOk])
    await new ZaloOaPlatformClient(m.vault, config, f.impl, () => NOW).sendText("u1", "x")
    expect(String(f.calls[0]?.body)).toContain("refresh_token=boot-rt")
    expect(m.stored()?.refreshToken).toBe("rt-2")
  })

  it("Zalo báo token hết hạn → làm mới một lần rồi gửi lại", async () => {
    const m = memoryVault(fresh())
    const f = fakeFetch([() => ({ error: -216, message: "expired" }), refreshOk(3), sendOk])
    const res = await new ZaloOaPlatformClient(m.vault, config, f.impl, () => NOW).sendText("u1", "x")
    expect(res.sent).toBe(true)
    expect(String(f.calls[1]?.body)).toContain("refresh_token=rt-1")
    expect(m.stored()?.accessToken).toBe("at-3")
  })

  it("tiến trình khác vừa làm mới → dùng token mới trong kho, không đốt refresh token lần nữa", async () => {
    const m = memoryVault(fresh("at-1"))
    // Lúc ta lấy khoá, kho đã có token mới do tiến trình khác ghi
    m.vault.withLock = vi.fn(async (fn) => fn(fresh("at-9", "rt-9"), async () => {}))
    const f = fakeFetch([() => ({ error: -216 }), sendOk])
    const res = await new ZaloOaPlatformClient(m.vault, config, f.impl, () => NOW).sendText("u1", "x")
    expect(res.sent).toBe(true)
    expect(f.calls.some((c) => c.url.includes("access_token"))).toBe(false)
  })

  it("người nhận ngoài cửa sổ 7 ngày → báo chưa gửi, không ném lỗi", async () => {
    const f = fakeFetch([() => ({ error: -213, message: "User has not interacted with OA" })])
    const res = await new ZaloOaPlatformClient(memoryVault(fresh()).vault, config, f.impl, () => NOW).sendText("u1", "x")
    expect(res.sent).toBe(false)
    expect(res.error).toContain("not interacted")
  })

  it("chưa cấu hình app → không gọi mạng", async () => {
    const f = fakeFetch([])
    const res = await new ZaloOaPlatformClient(memoryVault(null).vault, { appId: undefined, appSecret: undefined, bootstrapRefreshToken: undefined }, f.impl).sendText("u1", "x")
    expect(res.sent).toBe(false)
    expect(f.impl).not.toHaveBeenCalled()
  })
})
