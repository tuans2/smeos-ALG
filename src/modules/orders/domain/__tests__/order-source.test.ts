import { describe, expect, it } from "vitest"

import {
  ORDER_SOURCE_CODES,
  ORDER_SOURCES,
  isOrderSourceCode,
  normalizeOrderSource,
  orderSourceLabel,
  usesSharedIngestion,
} from "../order-source"

describe("danh mục nguồn đơn (SSOT)", () => {
  it("mỗi mã có đúng một định nghĩa khớp mã", () => {
    expect(Object.keys(ORDER_SOURCES).sort()).toEqual([...ORDER_SOURCE_CODES].sort())
    for (const code of ORDER_SOURCE_CODES) expect(ORDER_SOURCES[code].code).toBe(code)
  })

  it("Thẻ chào giữ luồng riêng hiện hành, không qua cổng chung (B1)", () => {
    expect(ORDER_SOURCES.BROCHURE.entryStage).toBe("LEGACY_BROCHURE")
    expect(usesSharedIngestion("BROCHURE")).toBe(false)
    for (const code of ORDER_SOURCE_CODES.filter((c) => c !== "BROCHURE")) expect(usesSharedIngestion(code)).toBe(true)
  })

  it("sàn ngoài và đơn mạng lưới vào thẳng Điều phối; landing/catalog/chat bắt đầu từ lead", () => {
    expect(ORDER_SOURCES.CHANNEL.entryStage).toBe("COORDINATION")
    expect(ORDER_SOURCES.NETWORK.entryStage).toBe("COORDINATION")
    expect(ORDER_SOURCES.LANDING.entryStage).toBe("LEAD")
    expect(ORDER_SOURCES.CATALOG.entryStage).toBe("LEAD")
    expect(ORDER_SOURCES.CHAT.entryStage).toBe("LEAD")
    expect(ORDER_SOURCES.MANUAL.entryStage).toBe("AWAITING_PAYMENT")
    expect(ORDER_SOURCES.QUOTATION.entryStage).toBe("AWAITING_PAYMENT")
  })

  it("giá trị DB lạ/rỗng đọc về MANUAL (mặc định cột orders.source)", () => {
    expect(normalizeOrderSource(null)).toBe("MANUAL")
    expect(normalizeOrderSource("ORDER_M10")).toBe("MANUAL")
    expect(normalizeOrderSource("BROCHURE")).toBe("BROCHURE")
    expect(isOrderSourceCode("brochure")).toBe(false)
  })

  it("nhãn hiển thị là tiếng Việt, không lộ mã kỹ thuật", () => {
    for (const code of ORDER_SOURCE_CODES) expect(orderSourceLabel(code)).not.toBe(code)
    expect(orderSourceLabel("CHANNEL")).toBe("Kênh bán ngoài")
  })
})
