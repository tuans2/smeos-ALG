import { describe, expect, it } from "vitest"
import { findCliches, findUndeclaredPromises } from "@/modules/content-engine/domain/landing-copy-guard"
import { ACTIVE_PROMPTS } from "@/modules/content-engine/domain/prompts/active"
import { LANDING_WRITER_PROMPT_V1 } from "@/modules/content-engine/domain/prompts/landing/v1"
import { LANDING_WRITER_PROMPT_V2 } from "@/modules/content-engine/domain/prompts/landing/v2"
import { CATALOG_WRITER_PROMPT_V1 } from "@/modules/content-engine/domain/prompts/catalog/v1"

describe("kiểm chữ landing/catalog", () => {
  it("bắt cụm sáo rỗng, không phân biệt hoa thường", () => {
    expect(findCliches("Thay Ngàn Lời Yêu — Tuyệt Tác cho nàng")).toEqual(expect.arrayContaining(["thay ngàn lời", "tuyệt tác"]))
    expect(findCliches("Hồng đỏ Ecuador cho ngày 20/10 của mẹ")).toEqual([])
  })

  it("bắt lời hứa chưa khai, cho phép khi tiệm đã khai nguyên văn", () => {
    expect(findUndeclaredPromises("Giao hỏa tốc trong 2 giờ nội thành")).toHaveLength(1)
    expect(findUndeclaredPromises("Hoa tươi 5-7 ngày, miễn phí giao hàng")).toHaveLength(2)
    expect(findUndeclaredPromises("Giao trong 2 giờ", ["Giao trong 2 giờ nội thành"])).toEqual([])
    expect(findUndeclaredPromises("Nhắn tiệm để được báo thời gian giao")).toEqual([])
  })
})

describe("prompt landing/catalog v2 trong content engine", () => {
  const base = {
    shopName: "Tiệm A", shopTone: undefined, occasionId: "20-10", occasionLabel: "Ngày Phụ nữ Việt Nam",
    archetypeId: undefined, selectedProducts: [{ name: "Bó hồng đỏ", price: 500000 }], userDirectives: undefined,
    discountPercent: undefined,
  }

  it("registry trỏ v2, giữ nguyên hình dạng đầu ra của v1 (quay về được)", () => {
    expect(ACTIVE_PROMPTS.landingWriter.version).toBe("v2")
    expect(ACTIVE_PROMPTS.catalogWriter.version).toBe("v2")
    expect(ACTIVE_PROMPTS.landingWriter.normalize).toBe(LANDING_WRITER_PROMPT_V1.normalize)
    expect(ACTIVE_PROMPTS.landingWriter.jsonSchema).toBe(LANDING_WRITER_PROMPT_V1.jsonSchema)
    expect(ACTIVE_PROMPTS.catalogWriter.normalize).toBe(CATALOG_WRITER_PROMPT_V1.normalize)
  })

  it("đưa điểm mạnh, cam kết, khách mục tiêu tiệm đã khai vào prompt", () => {
    const p = LANDING_WRITER_PROMPT_V2.build({
      ...base, usps: ["Hoa nhập từ Đà Lạt mỗi sáng"], guarantees: ["Gửi ảnh hoa trước khi giao"], targetAudience: "con gái mua tặng mẹ",
    })
    expect(p).toContain("Hoa nhập từ Đà Lạt mỗi sáng")
    expect(p).toContain("Gửi ảnh hoa trước khi giao")
    expect(p).toContain("con gái mua tặng mẹ")
    expect(p).toContain("tuyệt tác")
    expect(p).toMatch(/không nhắc giảm giá/)
  })

  it("chưa khai cam kết thì prompt ghi rõ, không để AI tự nghĩ ra", () => {
    expect(LANDING_WRITER_PROMPT_V2.build(base)).toContain("(tiệm chưa khai)")
  })
})

describe("nội dung mẫu dự phòng cũng qua được bộ kiểm chữ", () => {
  it("landing và catalog: không cụm sáo, không lời hứa chưa khai", async () => {
    const { generateLandingPageContent } = await import("@/modules/content-engine/domain/landing-content-generator")
    const { generateCatalogContent } = await import("@/modules/content-engine/domain/catalog-content-generator")
    for (const occasionId of ["20-10", "valentine", "khai-truong", "khac"]) {
      const pkg = generateLandingPageContent({
        shopName: "Tiệm A", occasionId, occasionLabel: "Dịp A", selectedProducts: [{ name: "Bó hồng đỏ" }],
      })
      const text = JSON.stringify(pkg)
      expect(findCliches(text), occasionId).toEqual([])
      expect(findUndeclaredPromises(text), occasionId).toEqual([])
    }
    for (const styleVariant of ["EDITORIAL_LOOKBOOK", "MODERN_SHOWROOM", "COMPACT_LIST"] as const) {
      const c = JSON.stringify(generateCatalogContent({ shopName: "Tiệm A", collectionName: "BST", occasion: undefined, productCount: 4, styleVariant } as never))
      expect(findCliches(c), styleVariant).toEqual([])
      expect(findUndeclaredPromises(c), styleVariant).toEqual([])
    }
  })
})
