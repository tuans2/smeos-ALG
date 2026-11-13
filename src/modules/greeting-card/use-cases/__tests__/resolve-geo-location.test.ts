import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import { resetCircuitBreakers } from "@/core/http/circuit-breaker"
import { GoongGeocoder } from "../../adapters/goong-geocoder"
import {
  fillMissingBranchLocations,
  normalizeAddressKey,
  resolveDeliveryLocation,
  type DeliveryGeoEntry,
  type IDeliveryGeoStore,
  type IGeocoder,
} from "../resolve-geo-location"

const ctx: TenantContext = { organizationId: "org-1", workspaceId: "", userId: "u", branchId: null, capabilities: new Set() }
const Q1 = { latitude: 10.776, longitude: 106.701 }

function memoryStore(initial: DeliveryGeoEntry | null = null) {
  let entry = initial
  const store: IDeliveryGeoStore = {
    loadDeliveryGeo: vi.fn(async () => entry),
    saveDeliveryGeo: vi.fn(async (_c, _o, e: DeliveryGeoEntry) => { entry = e }),
  }
  return { store, entry: () => entry }
}

const geocoder = (impl: IGeocoder["geocode"], configured = true): IGeocoder & { geocode: ReturnType<typeof vi.fn> } =>
  ({ configured, geocode: vi.fn(impl) })

describe("GoongGeocoder", () => {
  beforeEach(() => resetCircuitBreakers())

  const json = (body: unknown, ok = true) => vi.fn(async (_url: string, _init?: RequestInit) => ({ ok, status: ok ? 200 : 500, json: async () => body }) as unknown as Response)

  it("trả toạ độ kết quả đầu tiên", async () => {
    const fetchImpl = json({ results: [{ geometry: { location: { lat: 10.776, lng: 106.701 } } }] })
    expect(await new GoongGeocoder("key", fetchImpl).geocode("1 Lê Lợi, Quận 1")).toEqual(Q1)
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("address=1%20L%C3%AA%20L%E1%BB%A3i")
  })

  it("không có kết quả hoặc toạ độ ngoài Việt Nam → null", async () => {
    expect(await new GoongGeocoder("key", json({ results: [] })).geocode("x")).toBeNull()
    expect(await new GoongGeocoder("key", json({ results: [{ geometry: { location: { lat: 48.85, lng: 2.35 } } }] })).geocode("x")).toBeNull()
  })

  it("thiếu khoá → không gọi mạng", async () => {
    const fetchImpl = json({})
    const g = new GoongGeocoder(undefined, fetchImpl)
    expect(g.configured).toBe(false)
    expect(await g.geocode("x")).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("nhà cung cấp lỗi → ném lỗi để tầng gọi không lưu đệm", async () => {
    await expect(new GoongGeocoder("key", json({}, false)).geocode("x")).rejects.toThrow()
  })
})

describe("resolveDeliveryLocation", () => {
  const now = new Date("2026-10-22T10:00:00Z")

  it("cùng địa chỉ đã tra → dùng đệm, không gọi nhà cung cấp", async () => {
    const { store } = memoryStore({ addressKey: normalizeAddressKey("1 Lê Lợi,  Quận 1"), location: Q1, resolvedAt: now.toISOString() })
    const g = geocoder(async () => null)
    expect(await resolveDeliveryLocation(ctx, { orderId: "o1", address: "1 lê lợi , quận 1" }, g, store, now)).toEqual(Q1)
    expect(g.geocode).not.toHaveBeenCalled()
  })

  it("địa chỉ đổi → tra lại và lưu đệm mới", async () => {
    const m = memoryStore({ addressKey: "dia chi cu", location: Q1, resolvedAt: now.toISOString() })
    const g = geocoder(async () => ({ latitude: 10.8, longitude: 106.7 }))
    expect(await resolveDeliveryLocation(ctx, { orderId: "o1", address: "2 Hai Bà Trưng" }, g, m.store, now)).toEqual({ latitude: 10.8, longitude: 106.7 })
    expect(m.entry()?.addressKey).toBe("2 hai bà trưng")
  })

  it("'không tìm thấy' được nhớ 6 giờ rồi thử lại", async () => {
    const key = normalizeAddressKey("Ngõ không tên")
    const g = geocoder(async () => null)
    const fresh = memoryStore({ addressKey: key, location: null, resolvedAt: "2026-10-22T08:00:00Z" })
    await resolveDeliveryLocation(ctx, { orderId: "o1", address: "Ngõ không tên" }, g, fresh.store, now)
    expect(g.geocode).not.toHaveBeenCalled()

    const stale = memoryStore({ addressKey: key, location: null, resolvedAt: "2026-10-22T03:00:00Z" })
    await resolveDeliveryLocation(ctx, { orderId: "o1", address: "Ngõ không tên" }, g, stale.store, now)
    expect(g.geocode).toHaveBeenCalledTimes(1)
  })

  it("nhà cung cấp lỗi → null, không lưu đệm, không chặn điều phối", async () => {
    const m = memoryStore()
    const g = geocoder(async () => { throw new Error("timeout") })
    expect(await resolveDeliveryLocation(ctx, { orderId: "o1", address: "1 Lê Lợi" }, g, m.store, now)).toBeNull()
    expect(m.store.saveDeliveryGeo).not.toHaveBeenCalled()
  })
})

describe("fillMissingBranchLocations", () => {
  it("chỉ tra chi nhánh có địa chỉ mà thiếu toạ độ, giữ toạ độ nhập tay", async () => {
    const g = geocoder(async (addr) => (addr.includes("Q1") ? Q1 : null))
    const res = await fillMissingBranchLocations(
      [
        { address: "Q1", location: null },
        { address: "Q9", location: null },
        { address: "Có sẵn", location: { latitude: 1, longitude: 2 } },
        { address: "", location: null },
      ],
      g
    )
    expect(g.geocode).toHaveBeenCalledTimes(2)
    expect(res.branches[0]?.location).toEqual(Q1)
    expect(res.branches[2]?.location).toEqual({ latitude: 1, longitude: 2 })
    expect(res).toMatchObject({ geocoded: 1, notFound: 1, skipped: 0 })
  })

  it("chưa cấu hình nhà cung cấp → bỏ qua, báo số chi nhánh chưa có vị trí", async () => {
    const res = await fillMissingBranchLocations([{ address: "Q1", location: null }], geocoder(async () => Q1, false))
    expect(res).toMatchObject({ geocoded: 0, skipped: 1 })
  })
})
