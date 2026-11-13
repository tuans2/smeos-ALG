/**
 * Đánh giá khách do chủ tiệm nhập (PO 30/10/2026). Thuần — không Prisma, không mạng.
 * Chỉ đánh giá đang bật hiển thị mới lên trang khách Landing (08) / Catalog (09).
 */

export interface ShopReviewInput {
  authorName: string
  occasion?: string | null | undefined
  rating: number
  comment: string
  isVisible?: boolean | undefined
}

export interface ShopReview {
  id: string
  authorName: string
  occasion: string | null
  rating: number
  comment: string
  isVisible: boolean
  createdAt: string
}

/** Dạng hiển thị công khai — không có cờ quản trị, không có người tạo. */
export interface PublicShopReview {
  id: string
  author: string
  occasion: string
  rating: number
  comment: string
}

export const REVIEW_LIMITS = { author: 60, occasion: 60, commentMin: 5, comment: 500, publicMax: 6 } as const

export interface ValidReview {
  authorName: string
  occasion: string | null
  rating: number
  comment: string
  isVisible: boolean
}

export type ReviewValidation = { ok: true; value: ValidReview } | { ok: false; message: string }

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim()

export function validateReview(input: ShopReviewInput): ReviewValidation {
  const authorName = clean(input.authorName)
  const occasion = clean(input.occasion)
  const comment = clean(input.comment)
  if (!authorName || authorName.length > REVIEW_LIMITS.author) return { ok: false, message: "Tên khách cần từ 1 đến 60 ký tự." }
  if (occasion.length > REVIEW_LIMITS.occasion) return { ok: false, message: "Dịp tối đa 60 ký tự." }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return { ok: false, message: "Số sao từ 1 đến 5." }
  if (comment.length < REVIEW_LIMITS.commentMin || comment.length > REVIEW_LIMITS.comment) {
    return { ok: false, message: "Lời nhận xét cần từ 5 đến 500 ký tự." }
  }
  return { ok: true, value: { authorName, occasion: occasion || null, rating: input.rating, comment, isVisible: input.isVisible ?? true } }
}

export function toPublicReview(r: Pick<ShopReview, "id" | "authorName" | "occasion" | "rating" | "comment">): PublicShopReview {
  return { id: r.id, author: r.authorName, occasion: r.occasion ?? "", rating: r.rating, comment: r.comment }
}
