import { describe, expect, it } from "vitest"

import { contentLockedReason, contentStepStatuses, currentContentStep, toContentFlags, type ContentProductFlags } from "./content-journey"

const none: ContentProductFlags = { cardApproved: false, copyApproved: false, pitchSaved: false, approvedPosts: 0 }

describe("Tạo nội dung — hành trình 4 bước", () => {
  it("chưa chọn sản phẩm: Bước 1 cần nhập, Bước 2–4 mở để chọn từ Kho", () => {
    expect(contentStepStatuses(null)).toEqual(["INPUT_REQUIRED", "AVAILABLE", "AVAILABLE", "AVAILABLE"])
    expect(currentContentStep(null)).toBe("PRODUCT_CARD")
    expect(contentLockedReason("SALES_PITCH", null)).toBeNull()
  })

  it("Thẻ sản phẩm đã duyệt nhưng Bài giới thiệu chưa → Bước 2, 3 khoá; Bước 4 không bao giờ khoá", () => {
    const f = { ...none, cardApproved: true }
    expect(contentStepStatuses(f)).toEqual(["INPUT_REQUIRED", "LOCKED", "LOCKED", "AVAILABLE"])
    expect(contentLockedReason("SALES_PITCH", f)).toMatch(/Bước 1/)
    expect(contentLockedReason("AUTO_PUBLISH", f)).toBeNull()
  })

  it("đủ Bước 1 → mở Bước 2; Bước 3 chờ Thẻ chào được chốt", () => {
    const f = { ...none, cardApproved: true, copyApproved: true }
    expect(contentStepStatuses(f)).toEqual(["COMPLETED", "AVAILABLE", "LOCKED", "AVAILABLE"])
    expect(currentContentStep(f)).toBe("SALES_PITCH")
    expect(contentLockedReason("CHANNEL_POSTS", f)).toMatch(/Bước 2/)
  })

  it("đã chốt Thẻ chào → Bước 3; có bài đã duyệt → Bước 4", () => {
    const f = { ...none, cardApproved: true, copyApproved: true, pitchSaved: true }
    expect(currentContentStep(f)).toBe("CHANNEL_POSTS")
    const g = { ...f, approvedPosts: 2 }
    expect(contentStepStatuses(g)).toEqual(["COMPLETED", "COMPLETED", "COMPLETED", "AVAILABLE"])
    expect(currentContentStep(g)).toBe("AUTO_PUBLISH")
  })

  it("cờ trên API (snake_case) đổi đúng về dạng domain", () => {
    expect(toContentFlags({ card_approved: true, copy_approved: false, pitch_saved: true, approved_posts: 3 }))
      .toEqual({ cardApproved: true, copyApproved: false, pitchSaved: true, approvedPosts: 3 })
  })
})
