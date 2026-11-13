import { AppError } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { validateReview, type ShopReview, type ShopReviewInput } from "../domain/review-rules"
import {
  type ShopReviewWrite,
  deleteShopReview,
  insertShopReview,
  listShopReviews,
  updateShopReview,
} from "../infra/shop-review-repository"

/** Quản lý đánh giá hiện trên trang khách catalog/landing — cùng quyền tạo catalog (`J1`). */
const CAPABILITY = "J1"

export async function listReviews(ctx: TenantContext): Promise<ShopReview[]> {
  requireCapability(ctx, CAPABILITY)
  return listShopReviews(ctx)
}

export async function createReview(ctx: TenantContext, input: ShopReviewInput): Promise<ShopReview> {
  requireCapability(ctx, CAPABILITY)
  const v = validateReview(input)
  if (!v.ok) throw new AppError("VALIDATION_FAILED", v.message)
  return insertShopReview(ctx, v.value)
}

/** Sửa nội dung cần gửi đủ tên, sao, nhận xét (dịp tuỳ chọn); bật/tắt hiển thị gửi riêng `isVisible`. */
export async function updateReview(ctx: TenantContext, id: string, input: Partial<ShopReviewInput>): Promise<ShopReview> {
  requireCapability(ctx, CAPABILITY)
  let patch: Partial<ShopReviewWrite> = {}
  if (input.isVisible !== undefined) patch.isVisible = input.isVisible
  const contentChanged = ["authorName", "occasion", "rating", "comment"].some((k) => k in input)
  if (contentChanged) {
    const v = validateReview({
      authorName: input.authorName ?? "",
      occasion: input.occasion ?? null,
      rating: input.rating ?? 0,
      comment: input.comment ?? "",
    })
    if (!v.ok) throw new AppError("VALIDATION_FAILED", v.message)
    patch = { ...patch, authorName: v.value.authorName, occasion: v.value.occasion, rating: v.value.rating, comment: v.value.comment }
  }
  const updated = await updateShopReview(ctx, id, patch)
  if (!updated) throw new AppError("NOT_FOUND", "Không tìm thấy đánh giá")
  return updated
}

export async function removeReview(ctx: TenantContext, id: string): Promise<void> {
  requireCapability(ctx, CAPABILITY)
  if (!(await deleteShopReview(ctx, id))) throw new AppError("NOT_FOUND", "Không tìm thấy đánh giá")
}
