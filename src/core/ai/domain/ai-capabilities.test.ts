import { describe, expect, it } from "vitest"

import {
  AI_CAPABILITIES,
  ALL_AI_CAPABILITY_CODES,
  aiCapability,
  isDeterministic,
} from "./ai-capabilities"

describe("sổ đăng ký năng lực AI", () => {
  it("37 năng lực, mã AIC-01…AIC-37 liên tục", () => {
    expect(ALL_AI_CAPABILITY_CODES).toHaveLength(37)
    for (let i = 1; i <= 37; i += 1) {
      expect(AI_CAPABILITIES[`AIC-${String(i).padStart(2, "0")}`]).toBeDefined()
    }
  })

  it("tên đọc được là duy nhất — nó là khoá module truyền vào cổng AI", () => {
    const names = Object.values(AI_CAPABILITIES).map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it("tra được bằng cả mã và tên", () => {
    expect(aiCapability("AIC-01").name).toBe("product_vision")
    expect(aiCapability("product_vision").code).toBe("AIC-01")
  })

  it("bốn năng lực tất định, và chúng không có kênh chấm nào", () => {
    const det = Object.values(AI_CAPABILITIES).filter((c) => c.kind === "deterministic")
    expect(det.map((c) => c.code)).toEqual(["AIC-09", "AIC-14", "AIC-16", "AIC-20"])
    for (const cap of det) expect(cap.channels).toEqual([])
    expect(isDeterministic("watermark")).toBe(true)
  })

  it("mọi năng lực sinh hoặc đo đều khai ít nhất một kênh chấm", () => {
    for (const cap of Object.values(AI_CAPABILITIES)) {
      if (cap.kind === "deterministic") continue
      if (cap.code === "AIC-27") continue // embedding: đo bằng chất lượng truy hồi ở AIC-28
      expect(cap.channels.length).toBeGreaterThan(0)
    }
  })

  it("năng lực chạm dữ liệu cá nhân khách hàng mang sàn SENSITIVE", () => {
    expect(aiCapability("customer_segmentation").privacyFloor).toBe("SENSITIVE")
    // Nhắc mua sinh từ DỊP và SẢN PHẨM; định danh ghép ở tầng gửi (YC-K3/YC-K4).
    expect(aiCapability("reminder_message").privacyFloor).toBe("SHOP")
  })
})
