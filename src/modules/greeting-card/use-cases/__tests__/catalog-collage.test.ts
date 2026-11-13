import { describe, expect, it, vi } from "vitest"

vi.mock("@/modules/assets/adapters/storage-provider-factory", () => ({ getStorageProvider: () => ({ get: vi.fn() }) }))
vi.mock("../get-public-greeting-catalog", () => ({ getPublicGreetingCatalog: vi.fn() }))
vi.mock("../get-public-greeting-catalog-by-slug", () => ({ getPublicGreetingCatalogBySlug: vi.fn() }))
vi.mock("../get-greeting-catalog", () => ({
  getGreetingCatalogForCustomer: vi.fn().mockResolvedValue({
    status: "ACTIVE",
    catalog: { name: "Hoa Sinh Nhật" },
    shop: { name: "Tiệm Hoa Xinh" },
    products: [{ price: 500000, imageUrl: null }],
  }),
}))

const { priceLabelOf, catalogCollageBySendCode, buildCollage, collageLinkUrl, COLLAGE_MAX_IMAGES } = await import("../catalog-collage")
const { collageCellCount } = await import("@/components/greeting-card/og/catalog-collage-image")
const { generateQRCodeDataUrl } = await import("@/core/media/qr-engine")

describe("priceLabelOf", () => {
  it("khoảng giá từ thấp đến cao, bỏ mẫu chưa có giá", () => {
    expect(priceLabelOf([500000, null, 350000, 1200000])).toBe("350.000đ – 1.200.000đ")
  })
  it("cùng một giá → một số; không mẫu nào có giá → null", () => {
    expect(priceLabelOf([450000, 450000])).toBe("450.000đ")
    expect(priceLabelOf([null, 0])).toBeNull()
  })
})

describe("catalogCollageBySendCode", () => {
  it("trả về thông tin collage đúng khi session ACTIVE", async () => {
    const result = await catalogCollageBySendCode("ABC123XYZ")
    expect(result).toMatchObject({
      catalogName: "Hoa Sinh Nhật",
      shopName: "Tiệm Hoa Xinh",
      priceLabel: "500.000đ",
      logo: null,
      productCount: 1,
      images: [],
    })
  })
})

describe("ảnh ghép 3–4 mẫu kèm QR (ALG 5.4)", () => {
  const products = (n: number) => Array.from({ length: n }, (_, i) => ({ price: 100_000 * (i + 1), imageUrl: `img-${i}` }))
  const load = async (url: string) => `data:image/png;base64,${url}`
  const source = (n: number) => ({ catalog: { name: "Hoa 20/11" }, shop: { name: "Tiệm" }, products: products(n) })

  it("4 mẫu → 4 ô; 3 mẫu → 3 ô; 6 mẫu → 4 ô và nhãn +2", async () => {
    expect(COLLAGE_MAX_IMAGES).toBe(4)
    const four = await buildCollage(source(4), { load })
    expect(four.images).toEqual(["img-0", "img-1", "img-2", "img-3"].map((u) => `data:image/png;base64,${u}`))
    expect(collageCellCount(four.images.length)).toBe(4)
    expect(collageCellCount((await buildCollage(source(3), { load })).images.length)).toBe(3)
    const six = await buildCollage(source(6), { load })
    expect(six.images).toHaveLength(4)
    expect(six.productCount - collageCellCount(six.images.length)).toBe(2)
  })

  it("QR mã hoá đúng link đang chia sẻ; chưa có địa chỉ công khai → không QR", async () => {
    const result = await buildCollage(source(4), { load, linkPath: "/b/T01-ABC", baseUrl: "https://shop.example.vn" })
    expect(collageLinkUrl("/b/T01-ABC", "https://shop.example.vn")).toBe("https://shop.example.vn/b/T01-ABC")
    const expected = await generateQRCodeDataUrl("https://shop.example.vn/b/T01-ABC", { width: 240, margin: 1, darkColor: "#120A0D", lightColor: "#FBF5EE" })
    expect(result.qr).toBe(expected)
    expect((await buildCollage(source(4), { load, linkPath: "/b/T01-ABC", baseUrl: "" })).qr).toBeNull()
  })
})
