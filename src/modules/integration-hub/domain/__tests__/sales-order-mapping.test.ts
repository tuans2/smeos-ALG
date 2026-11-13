import { describe, expect, it } from "vitest"
import { channelPrepaidVnd, chunk, mapChannelOrder } from "../sales-order-mapping"
import { redactPayload } from "../redact-payload"

const order = {
  externalOrderId: "2410310000123456789",
  createdAt: "2026-10-31T00:00:00Z",
  items: [
    { sellerSku: "HOA-01", title: "Bó hồng", quantity: 2, unitPriceVnd: 350000 },
    { sellerSku: "LA-99", title: "Mẫu ngoài danh mục", quantity: 1, unitPriceVnd: 100000 },
    { sellerSku: null, title: "Hỏng", quantity: 0, unitPriceVnd: 1 },
  ],
  buyerNote: "Giao trước 10h",
  recipient: { name: "Lan", phone: "0901234567", address: "12 Lê Lợi" },
}

describe("Đơn kênh bán → đơn nội bộ", () => {
  it("nối SKU về sản phẩm, giữ dòng không khớp bằng mô tả, bỏ dòng số lượng 0, ghi nguồn CHANNEL", () => {
    const mapped = mapChannelOrder(order, new Map([["HOA-01", "p1"]]), "Shopee")!
    expect(mapped.input.items).toEqual([
      { productId: "p1", quantity: 2, unitPriceVnd: 350000 },
      { description: "Mẫu ngoài danh mục", quantity: 1, unitPriceVnd: 100000 },
    ])
    expect(mapped.unmatchedSkus).toEqual(["LA-99"])
    expect(mapped.input.source).toBe("CHANNEL")
    expect(mapped.input.internalNote).toContain("Đơn từ Shopee — mã 2410310000123456789")
    expect(mapped.input.deliveryAddress).toMatchObject({ recipientName: "Lan", phone: "0901234567" })
  })

  it("đơn không còn dòng hợp lệ → null; không có người nhận thì không bịa địa chỉ", () => {
    expect(mapChannelOrder({ ...order, items: [] }, new Map(), "Shopee")).toBeNull()
    expect(mapChannelOrder({ ...order, recipient: null }, new Map(), "Shopee")!.input.deliveryAddress).toBeUndefined()
  })

  it("chia lô theo giới hạn", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it("nhật ký giữ nguyên mã đơn số dài nhưng vẫn che số điện thoại", () => {
    const out = redactPayload({ orderId: "0912345678901", note: "gọi 0912345678" }) as Record<string, string>
    expect(out["orderId"]).toBe("0912345678901")
    expect(out["note"]).toBe("gọi [sđt]")
  })
})

describe("tiền đơn sàn (audit BL-34)", () => {
  it("đã trả trên sàn → ghi đúng số đã trả, không vượt tổng đơn; thu hộ / không rõ → 0", () => {
    expect(channelPrepaidVnd({ kind: "PREPAID", paidVnd: 250_000.4 }, 300_000)).toBe(250_000)
    expect(channelPrepaidVnd({ kind: "PREPAID", paidVnd: 350_000 }, 300_000)).toBe(300_000)
    expect(channelPrepaidVnd({ kind: "PREPAID", paidVnd: Number.NaN }, 300_000)).toBe(0)
    expect(channelPrepaidVnd({ kind: "COD", paidVnd: 300_000 }, 300_000)).toBe(0)
    expect(channelPrepaidVnd(null, 300_000)).toBe(0)
    expect(channelPrepaidVnd(undefined, 300_000)).toBe(0)
  })
})
