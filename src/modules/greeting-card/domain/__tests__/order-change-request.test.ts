import { describe, expect, it } from "vitest"
import {
  buildOrderChange,
  changeLockReason,
  changesForCustomer,
  orderColumnsFromSnapshot,
  quoteFactsOf,
  shippingFeeDelta,
  snapshotFromOrder,
  type OrderChangeSnapshot,
} from "../order-change-request"
import type { ShippingConfig } from "../brochure-pricing"

// 10:00 ngày 05/10/2026 giờ Việt Nam
const NOW = new Date("2026-10-05T03:00:00Z")
const SHIPPING: ShippingConfig = {
  zones: [
    { id: "q1", name: "Quận 1", feeVnd: 30_000 },
    { id: "far", name: "Ngoại thành", feeVnd: 80_000 },
  ],
  freeShippingOverVnd: null,
}

const BEFORE: OrderChangeSnapshot = {
  deliveryDate: "2026-10-20",
  deliveryTimeSlot: "08:00 - 10:00",
  recipientName: "Trần Thị B",
  recipientPhone: "0912345678",
  deliveryAddress: "45 Lê Lợi, Phường Bến Thành, TP. Hồ Chí Minh",
  addressParts: { houseNumber: "45", street: "Lê Lợi", ward: "Phường Bến Thành", province: "TP. Hồ Chí Minh" },
  shippingZoneId: "q1",
  shippingZoneName: "Quận 1",
  cardMessage: "Chúc mừng sinh nhật",
  deliveryNote: "",
  mapUrl: "",
}

describe("changeLockReason", () => {
  it("cho đổi khi chưa bắt đầu cắm hoa", () => {
    expect(changeLockReason({ status: "CONFIRMED", productionStatus: "WAITING", deliveryStatus: "PENDING" })).toBeNull()
    expect(changeLockReason({ status: "DRAFT", productionStatus: "ASSIGNED", deliveryStatus: "PENDING" })).toBeNull()
  })

  it("giao không thành công → mở lại để hẹn giao lại, nhưng khoá lời nhắn thiệp", () => {
    expect(changeLockReason({ status: "PROCESSING", productionStatus: "READY", deliveryStatus: "FAILED" })).toBeNull()
    const r = buildOrderChange(BEFORE, { cardMessage: "Khác", deliveryTimeSlot: "14:00 - 16:00" }, SHIPPING, NOW, { cardLocked: true })
    expect(!r.ok && r.errors.cardMessage).toMatch(/Thiệp đã in/)
    expect(buildOrderChange(BEFORE, { deliveryTimeSlot: "14:00 - 16:00" }, SHIPPING, NOW, { cardLocked: true }).ok).toBe(true)
  })

  it("khoá từ lúc bắt đầu cắm hoa (PO chốt), khi đã giao ship, đã xong hoặc đã huỷ", () => {
    expect(changeLockReason({ status: "PROCESSING", productionStatus: "ARRANGING", deliveryStatus: "PENDING" })).toMatch(/chế tác/)
    expect(changeLockReason({ status: "PROCESSING", productionStatus: "READY", deliveryStatus: "PENDING" })).toMatch(/chế tác/)
    expect(changeLockReason({ status: "PROCESSING", productionStatus: "READY", deliveryStatus: "DISPATCHED" })).not.toBeNull()
    expect(changeLockReason({ status: "COMPLETED", productionStatus: "READY", deliveryStatus: "DELIVERED" })).toMatch(/giao xong/)
    expect(changeLockReason({ status: "CANCELLED", productionStatus: "WAITING", deliveryStatus: "PENDING" })).toMatch(/huỷ/)
  })
})

describe("buildOrderChange", () => {
  it("đổi giờ giao + địa chỉ + khu vực, liệt kê đúng các ô đổi", () => {
    const r = buildOrderChange(BEFORE, {
      deliveryTimeSlot: "14:00 - 16:00",
      addressParts: { houseNumber: "12", street: "Nguyễn Trãi", ward: "Phường An Lạc", province: "TP. Hồ Chí Minh" },
      shippingZoneId: "far",
      note: "Người nhận chuyển nhà",
    }, SHIPPING, NOW)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.changes.map((c) => c.field)).toEqual(["schedule", "deliveryAddress", "shippingZone"])
    expect(r.after.deliveryAddress).toBe("12 Nguyễn Trãi, Phường An Lạc, TP. Hồ Chí Minh")
    expect(r.after.shippingZoneName).toBe("Ngoại thành")
    expect(r.note).toBe("Người nhận chuyển nhà")
  })

  it("báo lỗi khi không đổi gì", () => {
    const r = buildOrderChange(BEFORE, { recipientName: " Trần Thị B ", deliveryTimeSlot: BEFORE.deliveryTimeSlot }, SHIPPING, NOW)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.body).toMatch(/chưa thay đổi/)
  })

  it("kiểm ngày giờ mới theo cùng luật đặt hoa (quá khứ, khung giờ đã qua)", () => {
    const past = buildOrderChange(BEFORE, { deliveryDate: "2026-10-01" }, SHIPPING, NOW)
    expect(!past.ok && past.errors.deliveryDate).toBeTruthy()
    const lateSlot = buildOrderChange(BEFORE, { deliveryDate: "2026-10-05", deliveryTimeSlot: "08:00 - 10:00" }, SHIPPING, NOW)
    expect(!lateSlot.ok && lateSlot.errors.deliveryDate).toBeTruthy()
  })

  it("kiểm SĐT người nhận, khu vực không còn, link bản đồ lạ", () => {
    const r = buildOrderChange(BEFORE, { recipientPhone: "123", shippingZoneId: "gone", mapUrl: "https://evil.example" }, SHIPPING, NOW)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.recipientPhone).toBeDefined()
    expect(r.errors.shippingZoneId).toBeDefined()
    expect(r.errors.mapUrl).toBeDefined()
  })

  it("bỏ trống link bản đồ = xoá link", () => {
    const r = buildOrderChange({ ...BEFORE, mapUrl: "https://maps.app.goo.gl/x" }, { mapUrl: "" }, SHIPPING, NOW)
    expect(r.ok && r.after.mapUrl).toBe("")
  })
})

describe("shippingFeeDelta", () => {
  const quote = { subtotalVnd: 500_000, discountVnd: 0, shippingFeeVnd: 30_000 }
  it("phí tăng → cộng phần chênh", () => {
    expect(shippingFeeDelta(quote, 80_000, SHIPPING)).toBe(50_000)
  })
  it("phí giảm → giữ nguyên tổng (0)", () => {
    expect(shippingFeeDelta({ ...quote, shippingFeeVnd: 80_000 }, 30_000, SHIPPING)).toBe(0)
  })
  it("tiệm miễn phí giao mọi đơn hoặc đơn dùng ưu đãi miễn ship → 0", () => {
    expect(shippingFeeDelta(quote, 80_000, { freeShippingOverVnd: null, freeShippingAll: true })).toBe(0)
    const facts = quoteFactsOf({ ...quote, policies: { promotion: { id: "p", kind: "FREE_SHIPPING" } } })
    expect(facts.waivesShipping).toBe(true)
    expect(shippingFeeDelta(facts, 80_000, SHIPPING)).toBe(0)
    expect(shippingFeeDelta(quoteFactsOf(quote), 80_000, SHIPPING)).toBe(50_000)
  })

  it("đủ mức miễn phí giao hoặc đơn chờ báo giá → 0", () => {
    expect(shippingFeeDelta(quote, 80_000, { freeShippingOverVnd: 400_000 })).toBe(0)
    expect(shippingFeeDelta({ ...quote, awaitingQuote: true }, 80_000, SHIPPING)).toBe(0)
  })
})

describe("snapshotFromOrder / orderColumnsFromSnapshot", () => {
  const order = {
    delivery_window: { date: "2026-10-20", timeSlot: "08:00 - 10:00" },
    delivery_address: { recipientName: "Trần Thị B", phone: "0912345678", street: "45 Lê Lợi", zone: "Quận 1", notes: "Gọi trước", extra: 1 },
    card_message: null,
    pricing_rule_ref: { shippingZone: { id: "q1", name: "Quận 1" } },
  }
  it("đọc đơn cũ không lỗi và giữ khoá lạ khi ghi lại", () => {
    const snap = snapshotFromOrder(order)
    expect(snap).toMatchObject({ recipientName: "Trần Thị B", shippingZoneId: "q1", deliveryNote: "Gọi trước", cardMessage: "", addressParts: null })
    const cols = orderColumnsFromSnapshot(order.delivery_address, { ...snap, deliveryNote: "" }, { date: "x", failures: [{ at: "t" }] })
    expect(cols.delivery_window).toMatchObject({ date: "2026-10-20", failures: [{ at: "t" }] })
    expect(cols.delivery_address).toMatchObject({ extra: 1, recipientName: "Trần Thị B", zone: "Quận 1" })
    expect("notes" in cols.delivery_address).toBe(false)
    expect(cols.card_message).toBeNull()
  })
})

describe("changesForCustomer", () => {
  it("che SĐT người nhận, giữ nguyên ô khác", () => {
    const r = buildOrderChange(BEFORE, { recipientPhone: "0987 111 222", cardMessage: "Mới" }, SHIPPING, NOW)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const masked = changesForCustomer(r.changes)
    expect(masked.find((c) => c.field === "recipientPhone")).toMatchObject({ before: "••• 678", after: "••• 222" })
    expect(JSON.stringify(masked)).not.toContain("0987111222")
    expect(masked.find((c) => c.field === "cardMessage")?.after).toBe("Mới")
  })
})
