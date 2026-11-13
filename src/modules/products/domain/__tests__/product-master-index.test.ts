import { describe, expect, it } from "vitest"

import { mergeOccasions, projectCoordinatorSnapshot, type ProductMasterIndex } from "../product-master-index"

describe("mergeOccasions — hợp nhất dịp sử dụng từ hai nguồn M01/M01b", () => {
  it("giữ dịp do người duyệt M01b chọn tay, không chỉ dịp AI đoán ở M01", () => {
    expect(mergeOccasions(["Sinh nhật", "Kỷ niệm"], "Khai trương")).toEqual([
      "Sinh nhật",
      "Kỷ niệm",
      "Khai trương",
    ])
  })

  it("không tạo trùng khi AI đoán trùng với lựa chọn của người duyệt", () => {
    expect(mergeOccasions(["Sinh nhật"], "Sinh nhật")).toEqual(["Sinh nhật"])
  })

  it("chỉ có AI đoán, sản phẩm chưa qua duyệt M01b", () => {
    expect(mergeOccasions(undefined, "Valentine")).toEqual(["Valentine"])
  })

  it("chỉ có dữ liệu người duyệt, AI không đoán được dịp (null)", () => {
    expect(mergeOccasions(["Chia buồn"], undefined)).toEqual(["Chia buồn"])
  })

  it("không có nguồn nào thì trả mảng rỗng, không bịa một dịp mặc định", () => {
    expect(mergeOccasions(undefined, undefined)).toEqual([])
  })

  it("bỏ chuỗi rỗng/khoảng trắng thay vì giữ lại một dịp trống", () => {
    expect(mergeOccasions(["  ", "Sinh nhật"], "")).toEqual(["Sinh nhật"])
  })
})

describe("projectCoordinatorSnapshot — MI-5 (ĐP-2.3, 26/09/2026)", () => {
  function makeProduct(overrides: Partial<ProductMasterIndex> = {}): ProductMasterIndex {
    return {
      id: "prod-1",
      organizationId: "org-1",
      code: "HOA-001",
      name: "Bó Hồng Ohara Kem",
      status: "ACTIVE",
      category: "Sản phẩm",
      shape: "Tròn",
      facing: "Một mặt",
      style: "Hàn Quốc",
      occasions: ["Sinh nhật"],
      colorPalette: { primaryColor: "Kem", secondaryColor: "Trắng" },
      bom: {
        flowers: [{ flowerName: "Hồng Ohara", quantity: 10, unit: "cành", color: "Kem", role: "Chủ đạo" }],
        foliage: [{ name: "Dương xỉ", quantity: 3, unit: "cành", color: "Xanh", role: "Nền" }],
        wrapping: [{ layer: "Lớp ngoài", material: "Giấy kraft", color: "Nâu", texture: "Thô" }],
        wrapStyle: "Giấy kraft",
        ribbon: "Ruy băng lụa",
        accessories: [{ name: "Thiệp", material: "Giấy mỹ thuật", color: "Trắng", quantity: 1, printedText: null }],
        tierCount: 2,
      },
      pricing: { costPriceVnd: 300_000, quotePriceVnd: 850_000 },
      variants: [],
      galleryImages: [
        { role: "GALLERY", url: "/api/v1/storage/gallery.jpg" },
        { role: "REFERENCE", url: "/api/v1/storage/reference.jpg" },
      ],
      warningTags: ["Dị ứng phấn hoa"],
      dimensions: { heightCm: 40, widthCm: 30 },
      substitutionPolicy: { allowed: true, note: "Cùng tone màu" },
      updatedAt: "2026-09-26T01:00:00.000Z",
      ...overrides,
    }
  }

  it("chụp đủ trường theo Hợp đồng MI §5, TUYỆT ĐỐI không có costPriceVnd", () => {
    const product = makeProduct()
    const snapshot = projectCoordinatorSnapshot(product, new Date("2026-09-26T10:00:00.000Z"))

    expect(snapshot.productId).toBe("prod-1")
    expect(snapshot.code).toBe("HOA-001")
    expect(snapshot.name).toBe("Bó Hồng Ohara Kem")
    expect(snapshot.category).toBe("Sản phẩm")
    expect(snapshot.style).toBe("Hàn Quốc")
    expect(snapshot.colorPalette).toEqual({ primaryColor: "Kem", secondaryColor: "Trắng" })
    expect(snapshot.bom.flowers).toHaveLength(1)
    expect(snapshot.bom.foliage).toHaveLength(1)
    expect(snapshot.bom.wrapping).toHaveLength(1)
    expect(snapshot.bom.accessories).toHaveLength(1)
    expect(snapshot.tierCount).toBe(2)
    expect(snapshot.substitutionPolicy).toEqual({ allowed: true, note: "Cùng tone màu" })
    expect(snapshot.dimensions).toEqual({ heightCm: 40, widthCm: 30 })
    expect(snapshot.warningTags).toEqual(["Dị ứng phấn hoa"])
    expect(snapshot.quotePriceVnd).toBe(850_000)
    expect(snapshot.masterUpdatedAt).toBe("2026-09-26T01:00:00.000Z")
    expect(snapshot.capturedAt).toBe("2026-09-26T10:00:00.000Z")

    // Bất biến quan trọng nhất: giá vốn không bao giờ được vào snapshot.
    expect(snapshot).not.toHaveProperty("costPriceVnd")
    expect(JSON.stringify(snapshot)).not.toContain("300000")
  })

  it("chỉ lấy ảnh vai trò REFERENCE (MI-4) làm ảnh tham chiếu, bỏ GALLERY/CATALOG/SOCIAL", () => {
    const product = makeProduct()
    const snapshot = projectCoordinatorSnapshot(product)
    expect(snapshot.referenceImageUrls).toEqual(["/api/v1/storage/reference.jpg"])
  })

  it("sản phẩm chưa có ảnh REFERENCE nào thì trả mảng rỗng, không rơi về ảnh GALLERY", () => {
    const product = makeProduct({ galleryImages: [{ role: "GALLERY", url: "/api/v1/storage/gallery.jpg" }] })
    const snapshot = projectCoordinatorSnapshot(product)
    expect(snapshot.referenceImageUrls).toEqual([])
  })

  it("MI-12 (ĐP-2b, 26/09/2026): chụp nguyên các trường BOM mới khi có — variety/stemLengthCm/substitutionAllowed/substitutionPriority (hoa), substitutionAllowed (lá), pattern/quantity/substitutionAllowed (gói), unit/substitutionAllowed (phụ kiện)", () => {
    const product = makeProduct({
      bom: {
        flowers: [
          {
            flowerName: "Hồng Ohara",
            quantity: 10,
            unit: "cành",
            color: "Kem",
            role: "Chủ đạo",
            variety: "Ohara",
            stemLengthCm: 45,
            substitutionAllowed: true,
            substitutionPriority: 1,
          },
        ],
        foliage: [{ name: "Dương xỉ", quantity: 3, unit: "cành", color: "Xanh", role: "Nền", substitutionAllowed: false }],
        wrapping: [
          { layer: "Lớp ngoài", material: "Giấy kraft", color: "Nâu", texture: "Thô", pattern: "Chấm bi", quantity: 2, substitutionAllowed: true },
        ],
        wrapStyle: "Giấy kraft",
        ribbon: "Ruy băng lụa",
        accessories: [
          { name: "Thiệp", material: "Giấy mỹ thuật", color: "Trắng", quantity: 1, printedText: null, unit: "cái", substitutionAllowed: false },
        ],
        tierCount: 2,
      },
    })
    const snapshot = projectCoordinatorSnapshot(product)

    expect(snapshot.bom.flowers[0]!).toMatchObject({
      variety: "Ohara",
      stemLengthCm: 45,
      substitutionAllowed: true,
      substitutionPriority: 1,
    })
    expect(snapshot.bom.foliage[0]!).toMatchObject({ substitutionAllowed: false })
    expect(snapshot.bom.wrapping[0]!).toMatchObject({ pattern: "Chấm bi", quantity: 2, substitutionAllowed: true })
    expect(snapshot.bom.accessories[0]!).toMatchObject({ unit: "cái", substitutionAllowed: false })
  })

  it("MI-12: sản phẩm CŨ không có trường mới vẫn chụp bình thường, không có key nào bị bịa thêm", () => {
    const product = makeProduct()
    const snapshot = projectCoordinatorSnapshot(product)

    expect(snapshot.bom.flowers[0]!.variety).toBeUndefined()
    expect(snapshot.bom.flowers[0]!.stemLengthCm).toBeUndefined()
    expect(snapshot.bom.flowers[0]!.substitutionAllowed).toBeUndefined()
    expect(snapshot.bom.flowers[0]!.substitutionPriority).toBeUndefined()
    expect(snapshot.bom.foliage[0]!.substitutionAllowed).toBeUndefined()
    expect(snapshot.bom.wrapping[0]!.pattern).toBeUndefined()
    expect(snapshot.bom.wrapping[0]!.quantity).toBeUndefined()
    expect(snapshot.bom.accessories[0]!.unit).toBeUndefined()
  })
})
