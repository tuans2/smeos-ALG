import { describe, expect, it, vi } from "vitest"

import {
  AUTH_ENTRY_PATHS,
  crossOriginReason,
  guardCrossOrigin,
  needsOriginCheck,
  ORIGIN_CHECK_EXEMPT_PREFIXES,
  originCheckMode,
} from "@/core/http/origin-guard"
import { handle, jsonResponse } from "@/core/http/response"

/** ARC-022 (PO D-25, 11/11/2026): lệnh ghi có cookie phiên từ origin khác → 403 `CROSS_ORIGIN_REJECTED`. */
const ENV = { NODE_ENV: "test", PUBLIC_APP_URL: "https://app.smeos.vn" }
const SESSION = "smeos_session=abc"

function req(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new Request(`https://app.smeos.vn${path}`, { method: init.method ?? "POST", headers: init.headers ?? {} })
}

describe("needsOriginCheck", () => {
  it("chỉ lệnh ghi có cookie phiên (smeos_session, smeos_sso, floraos_sso)", () => {
    for (const cookie of ["smeos_session=a", "smeos_sso=b", "floraos_sso=c"]) {
      expect(needsOriginCheck(req("/api/v1/orders", { headers: { cookie } }), "/api/v1/orders")).toBe(true)
    }
    expect(needsOriginCheck(req("/api/v1/orders"), "/api/v1/orders")).toBe(false)
    expect(needsOriginCheck(req("/api/v1/orders", { method: "GET", headers: { cookie: SESSION } }), "/api/v1/orders")).toBe(false)
  })

  it("đăng nhập/đăng ký/dùng thử kiểm cả khi chưa có cookie (login CSRF)", () => {
    for (const relative of AUTH_ENTRY_PATHS) {
      const path = `/api/v1/${relative}`
      expect(needsOriginCheck(req(path), path)).toBe(true)
    }
  })

  it("tiền tố miễn trừ không kiểm dù có cookie", () => {
    for (const prefix of Object.keys(ORIGIN_CHECK_EXEMPT_PREFIXES)) {
      const path = `/api/v1/${prefix}x`
      expect(needsOriginCheck(req(path, { headers: { cookie: SESSION } }), path)).toBe(false)
    }
  })

  it("danh sách miễn trừ chỉ được thu hẹp, mục nào cũng có lý do", () => {
    expect(Object.keys(ORIGIN_CHECK_EXEMPT_PREFIXES).sort()).toEqual([
      "billing/sepay",
      "chat/webhooks/",
      "integration/",
      "internal/",
      "public/",
      "storage/",
    ])
    for (const reason of Object.values(ORIGIN_CHECK_EXEMPT_PREFIXES)) expect(reason.length).toBeGreaterThan(10)
  })
})

describe("crossOriginReason", () => {
  it("Origin trùng host request, x-forwarded-host hoặc PUBLIC_APP_URL → hợp lệ", () => {
    expect(crossOriginReason(req("/x", { headers: { origin: "https://app.smeos.vn" } }), ENV)).toBeNull()
    // Tên miền riêng của tiệm: host khách truy cập nằm ở x-forwarded-host sau proxy Render
    const custom = new Request("http://10.0.0.5:3200/x", { method: "POST", headers: { origin: "https://hoa-mai.vn", "x-forwarded-host": "hoa-mai.vn" } })
    expect(crossOriginReason(custom, ENV)).toBeNull()
    const internal = new Request("http://10.0.0.5:3200/x", { method: "POST", headers: { origin: "https://app.smeos.vn" } })
    expect(crossOriginReason(internal, ENV)).toBeNull()
  })

  it("Origin khác (kể cả tên miền con cùng site) hoặc 'null' → từ chối", () => {
    expect(crossOriginReason(req("/x", { headers: { origin: "https://evil.example" } }), ENV)).toBe("origin_mismatch")
    expect(crossOriginReason(req("/x", { headers: { origin: "https://khac.smeos.vn" } }), ENV)).toBe("origin_mismatch")
    expect(crossOriginReason(req("/x", { headers: { origin: "null" } }), ENV)).toBe("origin_null")
  })

  it("không có Origin: theo Sec-Fetch-Site; thiếu cả hai là máy gọi máy → hợp lệ", () => {
    expect(crossOriginReason(req("/x", { headers: { "sec-fetch-site": "same-origin" } }), ENV)).toBeNull()
    expect(crossOriginReason(req("/x", { headers: { "sec-fetch-site": "none" } }), ENV)).toBeNull()
    expect(crossOriginReason(req("/x", { headers: { "sec-fetch-site": "same-site" } }), ENV)).toBe("sec_fetch_site_same-site")
    expect(crossOriginReason(req("/x", { headers: { "sec-fetch-site": "cross-site" } }), ENV)).toBe("sec_fetch_site_cross-site")
    expect(crossOriginReason(req("/x"), ENV)).toBeNull()
  })
})

describe("originCheckMode", () => {
  it("mặc định: production chỉ ghi log (theo dõi 1 tuần, PO Q4), nơi khác chặn; biến môi trường thắng", () => {
    expect(originCheckMode({ NODE_ENV: "production" })).toBe("log")
    expect(originCheckMode({ NODE_ENV: "test" })).toBe("enforce")
    expect(originCheckMode({ NODE_ENV: "production", ORIGIN_CHECK_MODE: "enforce" })).toBe("enforce")
    expect(originCheckMode({ NODE_ENV: "development", ORIGIN_CHECK_MODE: "LOG" })).toBe("log")
    expect(originCheckMode({ NODE_ENV: "production", ORIGIN_CHECK_MODE: "sai" })).toBe("log")
  })
})

describe("guardCrossOrigin", () => {
  const evil = () => req("/api/v1/orders", { headers: { cookie: SESSION, origin: "https://evil.example" } })

  it("enforce: ném 403 và ghi sự kiện", () => {
    const onLog = vi.fn()
    expect(() => guardCrossOrigin(evil(), "/api/v1/orders", onLog, ENV)).toThrow(expect.objectContaining({ code: "CROSS_ORIGIN_REJECTED" }))
    expect(onLog).toHaveBeenCalledWith({ reason: "origin_mismatch", method: "POST", path: "/api/v1/orders", mode: "enforce" })
  })

  it("log: chỉ ghi, cho qua", () => {
    const onLog = vi.fn()
    expect(() => guardCrossOrigin(evil(), "/api/v1/orders", onLog, { ...ENV, ORIGIN_CHECK_MODE: "log" })).not.toThrow()
    expect(onLog).toHaveBeenCalledWith(expect.objectContaining({ mode: "log" }))
  })

  it("request hợp lệ không ghi gì", () => {
    const onLog = vi.fn()
    guardCrossOrigin(req("/api/v1/orders", { headers: { cookie: SESSION, origin: "https://app.smeos.vn" } }), "/api/v1/orders", onLog, ENV)
    expect(onLog).not.toHaveBeenCalled()
  })
})

describe("handle() — gắn bộ kiểm Origin", () => {
  const route = handle(async () => jsonResponse({ data: { ok: true } }))

  it("lệnh ghi có cookie từ origin lạ → 403 CROSS_ORIGIN_REJECTED, handler không chạy", async () => {
    const handler = vi.fn(async () => jsonResponse({ data: 1 }))
    const res = await handle(handler)(new Request("http://localhost/api/v1/orders", { method: "POST", headers: { cookie: SESSION, origin: "https://evil.example" } }))
    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe("CROSS_ORIGIN_REJECTED")
    expect(handler).not.toHaveBeenCalled()
  })

  it("cùng origin, GET, hoặc webhook công khai → chạy bình thường", async () => {
    const same = await route(new Request("http://localhost/api/v1/orders", { method: "POST", headers: { cookie: SESSION, origin: "http://localhost" } }))
    expect(same.status).toBe(200)
    const get = await route(new Request("http://localhost/api/v1/orders", { headers: { cookie: SESSION, origin: "https://evil.example" } }))
    expect(get.status).toBe(200)
    const pub = await route(new Request("http://localhost/api/v1/public/csp-report", { method: "POST", headers: { cookie: SESSION, origin: "https://evil.example" } }))
    expect(pub.status).toBe(200)
  })
})
