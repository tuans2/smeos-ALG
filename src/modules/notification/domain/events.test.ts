import { describe, it, expect } from "vitest"
import {
  getAllNotificationEvents,
  getNotificationEvent,
  getEventsByTier,
  getDefaultVisibleEvents,
} from "./events/index"

describe("Notification Event Registry", () => {
  it("nạp thành công toàn bộ sự kiện từ 4 tầng mà không có duplicate key", () => {
    const all = getAllNotificationEvents()
    expect(all.length).toBeGreaterThan(30)

    const keys = all.map((e) => e.key)
    const uniqueKeys = new Set(keys)
    expect(keys.length).toBe(uniqueKeys.size)
  })

  it("mỗi sự kiện đều có đầy đủ thông tin chuẩn contract", () => {
    const all = getAllNotificationEvents()
    for (const evt of all) {
      expect(evt.key).toMatch(/^[A-Z0-9_]+$/)
      expect(evt.label.length).toBeGreaterThan(0)
      expect(evt.description.length).toBeGreaterThan(0)
      expect(["MOTHER", "INDUSTRY", "CHAIN", "STORE"]).toContain(evt.tier)
      expect(Array.isArray(evt.defaultVisibleToTiers)).toBe(true)
      expect(Array.isArray(evt.roleDefaults)).toBe(true)
    }
  })

  it("lọc chính xác sự kiện theo tầng", () => {
    const storeEvents = getEventsByTier("STORE")
    expect(storeEvents.length).toBeGreaterThan(15)
    for (const e of storeEvents) {
      expect(e.tier).toBe("STORE")
    }

    const motherEvents = getEventsByTier("MOTHER")
    expect(motherEvents.length).toBeGreaterThan(4)
    for (const e of motherEvents) {
      expect(e.tier).toBe("MOTHER")
    }
  })

  it("tìm kiếm sự kiện theo key chính xác", () => {
    const evt = getNotificationEvent("ORDER_RECEIVED")
    expect(evt).toBeDefined()
    expect(evt?.tier).toBe("STORE")
    expect(evt?.group).toBe("ORDER")
  })

  it("getDefaultVisibleEvents trả về đầy đủ sự kiện cho STORE", () => {
    const storeVisible = getDefaultVisibleEvents("STORE")
    expect(storeVisible.length).toBeGreaterThan(15)
  })
})
