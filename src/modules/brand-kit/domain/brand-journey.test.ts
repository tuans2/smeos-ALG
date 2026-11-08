import { describe, expect, it } from "vitest"

import { brandStepStatuses, currentBrandStep, evaluateProfileStep, lockedReason } from "./brand-journey"
import { readBrandMaterials, withFeaturedProducts, MAX_FEATURED_PRODUCTS } from "./brand-assets"

const fullBusiness = {
  display_name: "Tiệm hoa Mộc Lan",
  phone: "0901 234 567",
  address: "12 Lê Lợi, Quận 1",
  description: "Hoa tươi cắm theo yêu cầu cho văn phòng.",
  target_customers: ["Văn phòng tặng sếp"],
}
const fullBrand = { brand_assets: { storefront_photos: ["org/a/x.jpg"], intro_video: "org/a/v.mp4", featured_product_ids: ["p1"] } }

describe("Thương hiệu — Bước 1 Hồ sơ cửa hàng", () => {
  it("đủ mục cần có + ảnh, video, sản phẩm chủ đạo → hoàn thành", () => {
    const r = evaluateProfileStep({ business: fullBusiness, brand: fullBrand })
    expect(r.done).toBe(true)
    expect(r.missing).toEqual([])
  })

  it("thiếu video và sản phẩm chủ đạo → chưa xong, nêu đúng mục thiếu", () => {
    const r = evaluateProfileStep({ business: fullBusiness, brand: { brand_assets: { storefront_photos: ["a.jpg"] } } })
    expect(r.done).toBe(false)
    expect(r.missing.map((m) => m.key)).toEqual(["intro_video", "featured_products"])
  })

  it("số điện thoại sai dạng và khách mục tiêu rỗng không được tính", () => {
    const r = evaluateProfileStep({ business: { ...fullBusiness, phone: "abc", target_customers: ["  "] }, brand: fullBrand })
    expect(r.missing.map((m) => m.key)).toEqual(["phone", "target_customers"])
  })

  it("chưa có hồ sơ → mọi mục đều thiếu, logo không bắt buộc", () => {
    const r = evaluateProfileStep({ business: null, brand: null })
    expect(r.missing).toHaveLength(8)
    expect(r.items.some((i) => i.key === "logo")).toBe(false)
  })
})

describe("Thương hiệu — mở khoá tuần tự", () => {
  it("chưa xong hồ sơ: bước 2 và 3 khoá", () => {
    const f = { profileDone: false, identityDone: false, landingDone: false }
    expect(brandStepStatuses(f)).toEqual(["INPUT_REQUIRED", "LOCKED", "LOCKED"])
    expect(currentBrandStep(f)).toBe("PROFILE")
    expect(lockedReason("IDENTITY", f)).toBeTruthy()
    expect(lockedReason("LANDING", f)).toBeTruthy()
  })

  it("xong hồ sơ, chưa chọn bộ nhận diện: bước 3 vẫn khoá", () => {
    const f = { profileDone: true, identityDone: false, landingDone: false }
    expect(brandStepStatuses(f)).toEqual(["COMPLETED", "AVAILABLE", "LOCKED"])
    expect(currentBrandStep(f)).toBe("IDENTITY")
    expect(lockedReason("IDENTITY", f)).toBeNull()
    expect(lockedReason("LANDING", f)).toBe("Chọn Bộ nhận diện thương hiệu trước")
  })

  it("đủ cả 3 bước", () => {
    const f = { profileDone: true, identityDone: true, landingDone: true }
    expect(brandStepStatuses(f)).toEqual(["COMPLETED", "COMPLETED", "COMPLETED"])
    expect(currentBrandStep(f)).toBe("LANDING")
  })
})

describe("nguyên liệu thương hiệu trong brand_assets", () => {
  it("đọc an toàn từ Json lạ, bỏ trùng và giá trị rỗng", () => {
    expect(readBrandMaterials(null)).toEqual({ storefrontPhotos: [], introVideo: null, featuredProductIds: [] })
    expect(readBrandMaterials({ featured_product_ids: ["a", "a", "", 3, "b"] }).featuredProductIds).toEqual(["a", "b"])
  })

  it("ghi sản phẩm chủ đạo giữ nguyên khoá khác và chặn trần", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `p${i}`)
    const out = withFeaturedProducts({ zalo_qr: "qr.png" }, ids)
    expect(out.zalo_qr).toBe("qr.png")
    expect(out.featured_product_ids).toHaveLength(MAX_FEATURED_PRODUCTS)
  })
})
