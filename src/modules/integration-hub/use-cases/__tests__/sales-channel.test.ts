import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { connectWithSecret } from "../manage-connection"
import { importChannelOrder, publishProducts, syncAvailability } from "../sales-channel"
import { channelInStock } from "../../domain/sales-order-mapping"
import { processDueEvents } from "../process-due-events"
import type { SalesDeps } from "../sales-channel-deps"
import type { ListingView } from "../../infra/sales-channel-repository"
import { ctxOf, makeFakeDeps } from "./fake-hub-deps"

const SECRET = "shop-secret-0123456789abcd"
let previous: string | undefined
beforeEach(() => {
  previous = process.env["INTEGRATION_TOKEN_SECRET"]
  process.env["INTEGRATION_TOKEN_SECRET"] = "unit-test-integration-secret-xyz"
})
afterEach(() => {
  if (previous === undefined) delete process.env["INTEGRATION_TOKEN_SECRET"]
  else process.env["INTEGRATION_TOKEN_SECRET"] = previous
})

const product = (id: string, code: string, extra: Partial<{ price_vnd: number | null; masterImageUrl: string; status: string; name: string }> = {}) => ({
  id, code, name: extra.name ?? `SP ${code}`, status: extra.status ?? "ACTIVE", price_vnd: extra.price_vnd === undefined ? 300000 : extra.price_vnd,
  masterImageUrl: extra.masterImageUrl ?? "https://cdn.example/x.jpg", barcode: null, weight_grams: null, tags: [],
})

function makeSalesDeps(products: ReturnType<typeof product>[], stock: Record<string, number> = {}) {
  const base = makeFakeDeps()
  const listings = new Map<string, ListingView>()
  const claimed = new Map<string, string>()
  const createOrder = vi.fn(async (_ctx: unknown, input: { items: Array<{ quantity: number; unitPriceVnd: number }> }) =>
    ({ id: `order-${createOrder.mock.calls.length}`, totalVnd: input.items.reduce((n, i) => n + i.quantity * i.unitPriceVnd, 0) }) as never)
  const recordPrepayment = vi.fn(async () => null)
  const deps: SalesDeps = {
    ...base.deps,
    listProducts: async (_ctx, filters) => products.filter((p) => !filters.ids || filters.ids.includes(p.id)) as never,
    createOrder,
    recordPrepayment,
    sales: {
      listListings: async (_ctx, _c, ids) => [...listings.values()].filter((l) => !ids || ids.includes(l.productId)),
      saveListing: async (_ctx, _c, input) => {
        listings.set(input.productId, { productId: input.productId, status: input.status, externalId: input.externalId ?? null, lastError: input.lastError ?? null, lastSyncedAt: null })
      },
      listOrders: async () => [],
      trackedStock: async (_ctx, ids) => new Map(ids.filter((id) => id in stock).map((id) => [id, stock[id]!])),
      claimOrderSystem: async (_o, _c, id) => {
        const state = claimed.get(id)
        if (state === "IMPORTED" || state === "IN_PROGRESS") return false
        claimed.set(id, "IN_PROGRESS")
        return true
      },
      finishOrderSystem: async (_c, id, outcome) => void claimed.set(id, "orderId" in outcome ? "IMPORTED" : "FAILED"),
      productIdsBySkuSystem: async (_o, skus) => new Map(products.filter((p) => skus.includes(p.code)).map((p) => [p.code, p.id])),
      cursorSystem: async () => null,
      saveCursorSystem: async () => {},
      activeSalesConnectionsSystem: async () => [],
    },
  }
  return { ...base, deps, listings, claimed, createOrder, recordPrepayment }
}

const orgA = ctxOf("org-a")

describe("Đăng sản phẩm lên kênh bán", () => {
  it("sản phẩm đủ dữ liệu được đăng; thiếu giá/ảnh ghi lý do, không đẩy lên kênh; kênh từ chối ghi lý do của kênh", async () => {
    const s = makeSalesDeps([product("p1", "HOA-01"), product("p2", "HOA-02", { price_vnd: null }), product("p3", "HOA-03", { name: "LOI tên" })])
    const conn = await connectWithSecret(orgA, { connectorKey: "test_shop", secret: SECRET }, s.deps)
    await publishProducts(orgA, { connectionId: conn.id, productIds: ["p1", "p2", "p3"] }, s.deps)
    expect(s.listings.get("p1")).toMatchObject({ status: "SYNCED", externalId: "ts-p1" })
    expect(s.listings.get("p2")).toMatchObject({ status: "REJECTED", lastError: "Chưa có giá" })
    expect(s.listings.get("p3")).toMatchObject({ status: "REJECTED", lastError: "Kênh thử từ chối tên bắt đầu bằng LOI" })
    expect(s.deps.audit).toHaveBeenCalledTimes(2) // kết nối + đăng
  })

  it("tổ chức khác không đăng được qua kết nối của mình (404); thiếu W3 bị chặn", async () => {
    const s = makeSalesDeps([product("p1", "HOA-01")])
    const conn = await connectWithSecret(orgA, { connectorKey: "test_shop", secret: SECRET }, s.deps)
    await expect(publishProducts(ctxOf("org-b"), { connectionId: conn.id, productIds: ["p1"] }, s.deps)).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(publishProducts(ctxOf("org-a", ["W1"]), { connectionId: conn.id, productIds: ["p1"] }, s.deps)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
  })
})

describe("Nhận đơn từ kênh bán", () => {
  it("nhập đơn một lần, gửi lại không tạo đơn trùng; đơn lỗi nhận lại được ở lượt sau", async () => {
    const s = makeSalesDeps([product("p1", "HOA-01")])
    await connectWithSecret(orgA, { connectorKey: "test_shop", secret: SECRET }, s.deps)
    const connection = s.connections[0]!
    expect(await importChannelOrder(connection, "HOA-01x2", s.deps)).toBe("order-1")
    expect(await importChannelOrder(connection, "HOA-01x2", s.deps)).toBeNull()
    expect(s.createOrder).toHaveBeenCalledTimes(1)
    expect(s.createOrder.mock.calls[0]![1]).toMatchObject({ source: "CHANNEL", items: [{ productId: "p1", quantity: 2 }] })
    await expect(importChannelOrder(connection, "khong-hop-le", s.deps)).rejects.toThrow("ORDER_NOT_FOUND")
    expect(s.claimed.get("khong-hop-le")).toBe("FAILED")
  })

  // PO 12/11/2026 (audit BL-34): đơn sàn đã thu → ghi sổ thu (hình thức sàn, mã tham chiếu = mã đơn sàn); COD → không
  it("đơn sàn đã trả trước → ghi khoản sàn đã thu; đơn thu hộ → không ghi", async () => {
    const s = makeSalesDeps([product("p1", "HOA-01")])
    await connectWithSecret(orgA, { connectorKey: "test_shop", secret: SECRET }, s.deps)
    const connection = s.connections[0]!
    await importChannelOrder(connection, "HOA-01x2", s.deps)
    expect(s.recordPrepayment).not.toHaveBeenCalled()
    const id = await importChannelOrder(connection, "HOA-01x3p", s.deps)
    expect(s.recordPrepayment).toHaveBeenCalledTimes(1)
    expect(s.recordPrepayment.mock.calls[0]).toMatchObject([{ organizationId: "org-a" }, { orderId: id, amountVnd: 300_000, externalOrderId: "HOA-01x3p" }])
  })

  it("sự kiện order.created trong hàng chờ gọi nhập đơn theo mã đơn", async () => {
    const s = makeSalesDeps([product("p1", "HOA-01")])
    await connectWithSecret(orgA, { connectorKey: "test_shop", secret: SECRET }, s.deps)
    await s.deps.events.recordInbound({ organizationId: "org-a", connectionId: s.connections[0]!.id, externalEventId: "e1", eventType: "order.created", payloadRedacted: { orderId: "HOA-01x1" } })
    const importOrder = vi.fn(async () => "order-x")
    expect(await processDueEvents(s.deps, importOrder)).toMatchObject({ done: 1 })
    expect(importOrder).toHaveBeenCalledWith(s.connections[0], "HOA-01x1")
  })
})

describe("Còn/hết hàng trên kênh bán (audit BL-34)", () => {
  it("đang mở bán và còn số lượng (nếu theo dõi) mới là còn hàng", () => {
    expect(channelInStock("ACTIVE", undefined)).toBe(true)
    expect(channelInStock("ACTIVE", 3)).toBe(true)
    expect(channelInStock("ACTIVE", 0)).toBe(false)
    expect(channelInStock("INACTIVE", 5)).toBe(false)
  })

  it("sản phẩm theo dõi tồn đã hết số lượng → đẩy hết hàng lên kênh", async () => {
    const s = makeSalesDeps([product("p1", "HOA-01"), product("p2", "HOA-02")], { p1: 0 })
    const conn = await connectWithSecret(orgA, { connectorKey: "test_shop", secret: SECRET }, s.deps)
    await publishProducts(orgA, { connectionId: conn.id, productIds: ["p1", "p2"] }, s.deps)
    const connector = s.deps.getConnector("test_shop")!
    const push = vi.spyOn(connector.sales!, "pushAvailability")
    expect(await syncAvailability(orgA, conn.id, s.deps)).toBe(2)
    const pushed = push.mock.calls.flatMap((c) => c[2])
    expect(pushed).toEqual(expect.arrayContaining([expect.objectContaining({ sku: "HOA-01", inStock: false }), expect.objectContaining({ sku: "HOA-02", inStock: true })]))
  })
})
