import { describe, expect, it } from "vitest"

import { BRAND_STYLES, styleForIndex, variantForIndex } from "./brand-styles"
import { contrastRatio, hexToHsl, hslToHex, readableTextOn, rotateHue } from "./color-math"
import { buildIdentityOption, cleanSlogan, initialsOf, paletteFor, parseIdentityContent, recommendStyle } from "./identity-option"
import { planGeneration } from "./option-rules"

describe("phép màu", () => {
  it("đổi qua lại hex ↔ HSL không lệch", () => {
    for (const hex of ["#1F2A44", "#E8505B", "#7A5C3E", "#FFFFFF", "#000000"]) {
      expect(hslToHex(hexToHsl(hex)!)).toBe(hex)
    }
    expect(hexToHsl("xanh")).toBeNull()
  })

  it("xoay sắc độ 360° quay về màu cũ; chữ đọc được trên nền sáng/tối", () => {
    expect(rotateHue("#E8505B", 360)).toBe("#E8505B")
    expect(readableTextOn("#FFFFFF")).toBe("#1A1A1A")
    expect(readableTextOn("#1F2A44")).toBe("#FFFFFF")
  })

  it("chữ đặt trên màu chính/phụ/nhấn của mọi phong cách đạt tương phản ≥ 4.5 (WCAG AA)", () => {
    for (const style of Object.values(BRAND_STYLES)) {
      for (const variant of [0, 1, 2]) {
        const p = paletteFor(style.key, variant)
        for (const bg of [p.primary, p.secondary, p.accent]) expect(contrastRatio(bg, readableTextOn(bg))).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

describe("phương án Bộ nhận diện", () => {
  it("3 phương án đầu đủ 3 phong cách, tạo thêm xoay vòng thành biến thể", () => {
    expect([0, 1, 2].map(styleForIndex)).toEqual(["LUXURY", "YOUTHFUL", "RUSTIC"])
    expect(styleForIndex(3)).toBe("LUXURY")
    expect(variantForIndex(3)).toBe(1)
  })

  it("biến thể đổi màu chính nhưng giữ nền và chữ", () => {
    const a = paletteFor("LUXURY", 0)
    const b = paletteFor("LUXURY", 1)
    expect(a).toEqual(BRAND_STYLES.LUXURY.palette)
    expect(b.primary).not.toBe(a.primary)
    expect(b.background).toBe(a.background)
    expect(b.text).toBe(a.text)
  })

  it("chữ viết tắt bỏ từ chung chung, giữ dấu tiếng Việt", () => {
    expect(initialsOf("Tiệm hoa Mộc Lan")).toBe("ML")
    expect(initialsOf("Đông Á Shop")).toBe("ĐÁ")
    expect(initialsOf("Hoa")).toBe("H")
  })

  it("khẩu hiệu AI: bỏ ngoặc, quá dài thì loại", () => {
    expect(cleanSlogan(" “Tươi mới mỗi ngày.” ")).toBe("Tươi mới mỗi ngày")
    expect(cleanSlogan("x".repeat(61))).toBeNull()
    expect(cleanSlogan(42)).toBeNull()
  })

  it("không có khẩu hiệu AI → dùng mẫu theo phong cách, ghi rõ nguồn", () => {
    const o = buildIdentityOption({ style: "RUSTIC", variant: 0, shopName: "Nhà Hoa Bé Na", slogan: null, rationale: null })
    expect(o.slogan).toBe(BRAND_STYLES.RUSTIC.fallbackSlogans[0])
    expect(o.slogan_source).toBe("template")
    expect(o.font_heading).toBe("Lora")
    expect(parseIdentityContent(JSON.parse(JSON.stringify(o)))).toEqual(o)
  })

  it("nội dung hỏng không làm vỡ màn hình", () => {
    expect(parseIdentityContent({ style_key: "LUXURY", palette: { primary: "đỏ" } })).toBeNull()
    expect(parseIdentityContent(null)).toBeNull()
  })

  it("gợi ý phong cách theo khách mục tiêu", () => {
    expect(recommendStyle({ description: null, brandMessage: null, targetCustomers: ["Sinh viên", "Cặp đôi"] })).toBe("YOUTHFUL")
    expect(recommendStyle({ description: "Hoa thủ công cho gia đình", brandMessage: null, targetCustomers: [] })).toBe("RUSTIC")
    expect(recommendStyle({ description: null, brandMessage: null, targetCustomers: [] })).toBe("LUXURY")
  })
})

describe("lượt sinh phương án", () => {
  const fresh = { batchCount: 0, latestBatchSize: 0, profileChanged: false }

  it("lượt đầu: 3 phương án miễn phí; không tạo lượt đầu lần hai", () => {
    const p = planGeneration(fresh, "initial")
    expect(p.ok && p.slots.length === 3 && !p.paid && p.batch === 1).toBe(true)
    expect(planGeneration({ batchCount: 1, latestBatchSize: 3, profileChanged: false }, "initial").ok).toBe(false)
  })

  it("tạo thêm: 1 phương án có tính phí, phong cách xoay vòng; chặn trần", () => {
    const p = planGeneration({ batchCount: 1, latestBatchSize: 3, profileChanged: false }, "extra")
    expect(p).toEqual({ ok: true, batch: 1, paid: true, slots: [{ style: "LUXURY", variant: 1 }] })
    expect(planGeneration(fresh, "extra").ok).toBe(false)
    expect(planGeneration({ batchCount: 1, latestBatchSize: 15, profileChanged: false }, "extra").ok).toBe(false)
  })

  it("tạo lại miễn phí chỉ khi hồ sơ đã đổi", () => {
    expect(planGeneration({ batchCount: 1, latestBatchSize: 4, profileChanged: false }, "refresh").ok).toBe(false)
    const p = planGeneration({ batchCount: 1, latestBatchSize: 4, profileChanged: true }, "refresh")
    expect(p.ok && p.batch === 2 && !p.paid && p.slots.length === 3).toBe(true)
  })
})
