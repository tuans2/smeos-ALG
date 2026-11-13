import { describe, expect, it } from "vitest"
import { availabilityOf, canStartConnect } from "../catalog-availability"
import { CONNECTOR_CATALOG, findManifest } from "../connector-catalog"
import { canTransition, needsAttention, statusAfterHealthCheck } from "../connection-lifecycle"
import { MAX_EVENT_ATTEMPTS, outcomeAfterFailure } from "../event-retry-policy"
import { redactPayload } from "../redact-payload"

const base = { planFeatures: new Set<string>(), connectedKeys: new Set<string>(), isProduction: false }

describe("Danh mục đầu nối", () => {
  it("khoá đầu nối là duy nhất", () => {
    const keys = CONNECTOR_CATALOG.map((m) => m.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("đầu nối LEGACY luôn có màn hình cũ để chuyển tới", () => {
    for (const m of CONNECTOR_CATALOG.filter((x) => x.status === "LEGACY")) expect(m.legacyHref).toBeTruthy()
  })

  it("đầu nối quản lý bằng phân hệ sẵn có luôn có panel nhúng", () => {
    for (const m of CONNECTOR_CATALOG.filter((x) => x.status === "MANAGED")) expect(m.panel).toBeTruthy()
  })

  it("kênh bán hàng cần gói có integrations.sales_channels", () => {
    const shopee = findManifest("shopee")!
    expect(availabilityOf(shopee, { ...base, tier: "STORE" })).toBe("NEEDS_UPGRADE")
    const pro = { ...base, tier: "STORE" as const, planFeatures: new Set(["integrations.sales_channels"]) }
    expect(availabilityOf(shopee, pro)).toBe("COMING_SOON")
  })

  it("cửa hàng kế thừa đầu nối dùng chung của chuỗi", () => {
    expect(availabilityOf(findManifest("zalo_zns")!, { ...base, tier: "STORE" })).toBe("INHERITED")
    expect(availabilityOf(findManifest("zalo_zns")!, { ...base, tier: "CHAIN" })).toBe("AVAILABLE")
  })

  it("đầu nối thử bị ẩn trên production", () => {
    const echo = findManifest("test_echo")!
    expect(availabilityOf(echo, { ...base, tier: "STORE", isProduction: true })).toBe("HIDDEN")
    expect(availabilityOf(echo, { ...base, tier: "STORE" })).toBe("AVAILABLE")
  })

  it("trang của tích hợp không có trong bản cài theo giai đoạn thì ẩn thẻ, không còn liên kết chết", () => {
    const chain = findManifest("chain_link")!
    expect(availabilityOf(chain, { ...base, tier: "STORE" })).toBe("LEGACY")
    expect(availabilityOf(chain, { ...base, tier: "STORE", isRouteOutOfPhase: (href) => href === "/noi-bo/ket-noi" })).toBe("HIDDEN")
  })

  it("đầu nối nhiều tài khoản vẫn kết nối thêm được sau khi đã kết nối", () => {
    const echo = findManifest("test_echo")!
    const a = availabilityOf(echo, { ...base, tier: "STORE", connectedKeys: new Set(["test_echo"]) })
    expect(a).toBe("CONNECTED")
    expect(canStartConnect(a, echo)).toBe(true)
    expect(canStartConnect("COMING_SOON", echo)).toBe(false)
  })
})

describe("Vòng đời kết nối", () => {
  it("chặn chuyển trạng thái không hợp lệ", () => {
    expect(canTransition("DISCONNECTED", "DEGRADED")).toBe(false)
    expect(canTransition("ACTIVE", "EXPIRED")).toBe(true)
  })

  it("lỗi tạm thời: ACTIVE → DEGRADED → ERROR; hết hạn → EXPIRED; khoẻ lại → ACTIVE", () => {
    expect(statusAfterHealthCheck("ACTIVE", { ok: false, transient: true })).toBe("DEGRADED")
    expect(statusAfterHealthCheck("DEGRADED", { ok: false, transient: true })).toBe("ERROR")
    expect(statusAfterHealthCheck("ACTIVE", { ok: false, expired: true })).toBe("EXPIRED")
    expect(statusAfterHealthCheck("ERROR", { ok: true })).toBe("ACTIVE")
    expect(statusAfterHealthCheck("DISCONNECTED", { ok: true })).toBe("DISCONNECTED")
  })

  it("trạng thái cần xử lý", () => {
    expect(needsAttention("EXPIRED")).toBe(true)
    expect(needsAttention("ACTIVE")).toBe(false)
  })
})

describe("Thử lại sự kiện có giới hạn", () => {
  const now = new Date("2026-10-30T00:00:00Z")
  it("lần đầu thất bại hẹn lại sau 30 giây", () => {
    const out = outcomeAfterFailure(1, now)
    expect(out.status).toBe("FAILED")
    if (out.status === "FAILED") expect(out.nextRetryAt.getTime() - now.getTime()).toBe(30_000)
  })
  it("hết lượt thì DEAD", () => {
    expect(outcomeAfterFailure(MAX_EVENT_ATTEMPTS, now).status).toBe("DEAD")
  })
})

describe("Che payload trước khi lưu", () => {
  it("ẩn bí mật, số điện thoại, email", () => {
    const out = redactPayload({ access_token: "abc", note: "gọi 0901234567 hoặc a@b.vn", nested: { Secret: "x" } }) as Record<string, unknown>
    expect(out["access_token"]).toBe("[đã ẩn]")
    expect(out["note"]).toBe("gọi [sđt] hoặc [email]")
    expect((out["nested"] as Record<string, unknown>)["Secret"]).toBe("[đã ẩn]")
  })
  it("cắt chuỗi quá dài và giới hạn độ sâu", () => {
    expect((redactPayload("x".repeat(900)) as string).length).toBe(501)
    let deep: unknown = "leaf"
    for (let i = 0; i < 10; i++) deep = { d: deep }
    expect(JSON.stringify(redactPayload(deep))).toContain("[…]")
  })
})
