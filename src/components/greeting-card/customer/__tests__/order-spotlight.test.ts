import { describe, it, expect } from "vitest"
import {
  availableNoteKinds,
  defaultOpenNoteKinds,
  initialOpenNoteKinds,
} from "../order-spotlight/order-note-kinds"
import { spotlightClasses } from "../order-spotlight/spotlight-block"

describe("Khối Ghi chú dạng gọn — ô mở sẵn theo ngành", () => {
  it("ngành hoa và quà tặng mở sẵn lời nhắn trên thiệp", () => {
    for (const key of ["FLORAL", "CRAFT_GIFT", "RETAIL_GENERAL", "FASHION", "FNB", null, "UNKNOWN"]) {
      expect(defaultOpenNoteKinds(key)).toEqual(["cardMessage"])
    }
  })

  it("dịch vụ mở sẵn ghi chú yêu cầu, homestay mở sẵn yêu cầu đặc biệt", () => {
    expect(defaultOpenNoteKinds("SERVICES")).toEqual(["senderNote"])
    expect(defaultOpenNoteKinds("HOMESTAY")).toEqual(["specialRequests"])
  })

  it("homestay chỉ có yêu cầu đặc biệt; ngành khác có đủ 4 loại ghi chú", () => {
    expect(availableNoteKinds("HOMESTAY")).toEqual(["specialRequests"])
    expect(availableNoteKinds("FLORAL")).toEqual(["cardMessage", "senderNote", "deliveryNote", "mapUrl"])
  })

  it("ô đã có nội dung (khách quay lại sửa đơn) tự mở, theo thứ tự chuẩn", () => {
    expect(initialOpenNoteKinds("FLORAL", { mapUrl: "https://maps.app.goo.gl/x", deliveryNote: "  " })).toEqual([
      "cardMessage",
      "mapUrl",
    ])
    expect(initialOpenNoteKinds("SERVICES", { cardMessage: "Chúc mừng" })).toEqual(["cardMessage", "senderNote"])
  })
})

describe("Chuẩn Spotlight", () => {
  it("khối đang chọn nổi bật, khối khác chìm xuống và sáng lên khi rê chuột", () => {
    const on = spotlightClasses(true)
    expect(on.block).toContain("border-primary/50")
    expect(on.block).toContain("ring-2 ring-primary/20")
    expect(on.badge).toBe("bg-primary text-white")
    const off = spotlightClasses(false)
    // Không làm mờ chữ — khối chưa chọn vẫn đủ tương phản (PO 29/10/2026)
    expect(off.block).not.toMatch(/opacity-/)
    expect(off.block).toContain("bg-transparent")
  })
})

describe("Báo lỗi theo khối", () => {
  it("đưa lỗi về đúng khối chứa trường", async () => {
    const { orderErrorBlock } = await import("../order-spotlight/order-error-block")
    expect(orderErrorBlock("selectedPromotionId")).toBe(1)
    expect(orderErrorBlock("customerPhone")).toBe(2)
    expect(orderErrorBlock("recipientName")).toBe(3)
    expect(orderErrorBlock("houseNumber")).toBe(3)
    expect(orderErrorBlock("checkOutDate")).toBe(3)
    expect(orderErrorBlock("mapUrl")).toBe(4)
    expect(orderErrorBlock("")).toBeNull()
  })

  it("người mua cũng là người nhận → lỗi người nhận thuộc khối Người mua", async () => {
    const { orderErrorBlock } = await import("../order-spotlight/order-error-block")
    expect(orderErrorBlock("recipientPhone", true)).toBe(2)
  })
})
