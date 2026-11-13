import { REVIEW_LIMITS, toPublicReview, type PublicShopReview } from "../domain/review-rules"
import { listVisibleShopReviewsForOrganization } from "../infra/shop-review-repository"

/**
 * Đánh giá đang bật của một tiệm cho trang khách công khai. `organizationId` phải đến từ bản ghi
 * link catalog đã tra ở máy chủ, không từ tham số người dùng. Lỗi đọc → rỗng (mục Đánh giá ẩn).
 */
export async function getPublicReviewsForOrganization(organizationId: string): Promise<PublicShopReview[]> {
  try {
    const rows = await listVisibleShopReviewsForOrganization(organizationId, REVIEW_LIMITS.publicMax)
    return rows.map(toPublicReview)
  } catch {
    return []
  }
}
