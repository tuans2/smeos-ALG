import { describe, expect, it } from "vitest"

import { deliveryAreaOf, extractRecipientInfo, formatDeliveryAddress } from "@/modules/greeting-card/domain/delivery-address"
import { readDeliveryNote } from "@/modules/greeting-card/domain/delivery-note"
import { snapshotFromOrder } from "@/modules/greeting-card/domain/order-change-request"

import { deliveryAddressView, recipientFromDeliveryAddress, stripRecipientPii } from "../order-recipient"

/** Dạng `delivery_address` đang có trong dữ liệu (đơn Thẻ chào, nhập tay, điều phối). */
const CURRENT = [
  { recipientName: "Lan", phone: "0912345678", street: "45 Lê Lợi, Bến Thành, HCM", parts: { houseNumber: "45", street: "Lê Lợi", ward: "Bến Thành", province: "HCM" }, zone: "Q1", notes: "Gọi trước", mapUrl: "https://maps.app.goo.gl/abc" },
  { recipientName: "Mai", phone: "0909", street: "9 Hai Bà Trưng", parts: { houseNumber: "9", street: "Hai Bà Trưng", ward: "Tân Định", district: "Q1", province: "HCM" } },
  { recipientName: "Hoa", phone: "0911", street: "5 Nguyễn Huệ", ward: "Bến Nghé", district: "Q1", province: "HCM", notes: "Cổng sau" },
  { street: "123 Phố Huế", ward: "Ngô Thì Nhậm", district: "Hai Bà Trưng", city: "Hà Nội", country: "VN", formattedAddress: "123 Phố Huế, Hà Nội" },
  { recipientName: "Bình", phone: "0901234567", street: "1 Lê Lợi, Q1" },
  { notes: "chỉ ghi chú" },
]
/** Dữ liệu cũ: chuỗi, khoá cũ, ô trống. */
const LEGACY = ["  12 Lê Lợi, Q1  ", "", { name: "Cúc", recipientPhone: "0933" }, { full_address: "1 Đồng Khởi" }, { fullAddress: "2 Đồng Khởi" }, { address: "3 Đồng Khởi", phone: "  " }, { formattedAddress: "4 Đồng Khởi" }, null]

const SNAPSHOT_EXTRA = { delivery_window: { date: "2026-11-20", timeSlot: "08:00 - 10:00" }, card_message: "Chúc mừng", pricing_rule_ref: { shippingZone: { id: "q1", name: "Quận 1" } } }

describe("ADR-014 P-3b — deliveryAddressView dựng lại JSON từ order_recipients", () => {
  const variants = (raw: unknown) => {
    const r = recipientFromDeliveryAddress(raw)
    return [deliveryAddressView(raw, r), deliveryAddressView(stripRecipientPii(raw), r)] // nay (ghi kép) và sau P-3c (JSON đã bỏ PII)
  }

  it("dạng hiện có: JSON đọc ra trùng khớp JSON gốc, kể cả khi JSON đã bỏ dữ liệu cá nhân", () => {
    for (const raw of CURRENT) for (const v of variants(raw)) expect(v).toEqual(raw)
  })

  it("dữ liệu cũ: các hàm đọc của màn hình cho cùng kết quả", () => {
    for (const raw of [...CURRENT, ...LEGACY]) {
      for (const v of variants(raw)) {
        expect(formatDeliveryAddress(v), JSON.stringify(raw)).toBe(formatDeliveryAddress(raw))
        expect(extractRecipientInfo(v), JSON.stringify(raw)).toEqual(extractRecipientInfo(raw))
        expect(deliveryAreaOf(v), JSON.stringify(raw)).toEqual(deliveryAreaOf(raw))
        expect(readDeliveryNote(v), JSON.stringify(raw)).toEqual(readDeliveryNote(raw))
      }
    }
    for (const raw of CURRENT) {
      for (const v of variants(raw)) {
        expect(snapshotFromOrder({ ...SNAPSHOT_EXTRA, delivery_address: v })).toEqual(snapshotFromOrder({ ...SNAPSHOT_EXTRA, delivery_address: raw }))
      }
    }
  })

  it("đơn chưa có dòng người nhận → JSON như cũ; bỏ PII giữ khoá vận hành", () => {
    expect(deliveryAddressView(CURRENT[0], null)).toBe(CURRENT[0])
    expect(stripRecipientPii(CURRENT[0])).toEqual({ zone: "Q1", notes: "Gọi trước", mapUrl: "https://maps.app.goo.gl/abc" })
    expect(stripRecipientPii("1 Lê Lợi")).toBeNull()
    expect(deliveryAddressView(null, recipientFromDeliveryAddress(null))).toBeNull()
  })
})
