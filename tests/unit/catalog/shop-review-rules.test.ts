import { describe, expect, it } from "vitest"
import { toPublicReview, validateReview } from "@/modules/shop-reviews/domain/review-rules"

describe("quy tắc đánh giá khách", () => {
  it("chuẩn hoá khoảng trắng, dịp rỗng thành null, mặc định hiển thị", () => {
    const v = validateReview({ authorName: "  Chị   Lan ", occasion: " ", rating: 5, comment: "Hoa  đẹp lắm" })
    expect(v).toEqual({ ok: true, value: { authorName: "Chị Lan", occasion: null, rating: 5, comment: "Hoa đẹp lắm", isVisible: true } })
  })

  it("từ chối sao ngoài 1–5, tên trống, nhận xét quá ngắn", () => {
    expect(validateReview({ authorName: "A", rating: 6, comment: "Tốt lắm ạ" }).ok).toBe(false)
    expect(validateReview({ authorName: "A", rating: 4.5, comment: "Tốt lắm ạ" }).ok).toBe(false)
    expect(validateReview({ authorName: " ", rating: 5, comment: "Tốt lắm ạ" }).ok).toBe(false)
    expect(validateReview({ authorName: "A", rating: 5, comment: "ok" }).ok).toBe(false)
  })

  it("dạng công khai không có cờ quản trị", () => {
    const p = toPublicReview({ id: "1", authorName: "Chị Lan", occasion: null, rating: 5, comment: "Đẹp" })
    expect(p).toEqual({ id: "1", author: "Chị Lan", occasion: "", rating: 5, comment: "Đẹp" })
  })
})
