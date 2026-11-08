import { describe, expect, it } from "vitest"

import { MAX_PHOTOS_PER_BATCH, MAX_POLL_ATTEMPTS, checkPhoto, mergePhotos, planScan, pollDecision } from "./photo-batch"

const photo = (name: string, type = "image/jpeg", size = 1000) => ({ name, type, size })

describe("Bước 1 — tải ảnh", () => {
  it("chỉ nhận JPG/PNG/WEBP dưới 15 MB", () => {
    expect(checkPhoto(photo("a.jpg")).ok).toBe(true)
    expect(checkPhoto(photo("a.gif", "image/gif")).reason).toMatch(/JPG/)
    expect(checkPhoto(photo("a.jpg", "image/jpeg", 16 * 1024 * 1024)).reason).toMatch(/15 MB/)
  })

  it("ghép ảnh: bỏ ảnh hỏng, dừng ở trần mỗi lần tải", () => {
    const many = Array.from({ length: MAX_PHOTOS_PER_BATCH + 2 }, (_, i) => photo(`p${i}.jpg`))
    const r = mergePhotos([], [photo("x.gif", "image/gif"), ...many])
    expect(r.photos).toHaveLength(MAX_PHOTOS_PER_BATCH)
    expect(r.errors).toHaveLength(2)
  })

  it("một sản phẩm nhiều góc → quét ảnh chính, các góc khác gắn vào sản phẩm", () => {
    expect(planScan("ONE_PRODUCT", ["a", "b", "c"])).toEqual({ scanAssetIds: ["a"], extraAssetIds: ["b", "c"] })
  })

  it("nhiều sản phẩm → quét mọi ảnh, mỗi ảnh một thẻ", () => {
    expect(planScan("MANY_PRODUCTS", ["a", "b"])).toEqual({ scanAssetIds: ["a", "b"], extraAssetIds: [] })
    expect(planScan("MANY_PRODUCTS", [])).toEqual({ scanAssetIds: [], extraAssetIds: [] })
  })

  it("chờ kết quả có trần — hết lượt thì dừng, không chờ vô hạn", () => {
    expect(pollDecision("PROCESSING", 1)).toBe("WAIT")
    expect(pollDecision("COMPLETED", 1)).toBe("DONE")
    expect(pollDecision("CANCELLED", 1)).toBe("FAILED")
    expect(pollDecision(null, MAX_POLL_ATTEMPTS)).toBe("TIMED_OUT")
  })
})
