import { afterAll, beforeEach, describe, expect, it } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import { createReview, listReviews, removeReview, updateReview } from "@/modules/shop-reviews/use-cases/manage-shop-reviews"
import { getPublicReviewsForOrganization } from "@/modules/shop-reviews/use-cases/get-public-reviews"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** Đánh giá khách do chủ tiệm nhập (30/10/2026): cách ly tổ chức, khác tổ chức → 404, trang công khai chỉ thấy đánh giá đang bật. */
describe("cách ly tenant — đánh giá khách (shop_reviews)", () => {
  let a: Tenant
  let b: Tenant
  const withJ1 = (ctx: TenantContext): TenantContext => ({ ...ctx, capabilities: new Set([...ctx.capabilities, "J1"]) })

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tổ chức khác không thấy, không sửa, không xoá được → NOT_FOUND", async () => {
    const r = await createReview(withJ1(a.ctx), { authorName: "Chị Lan", rating: 5, comment: "Hoa đẹp, giao đúng giờ." })
    expect((await listReviews(withJ1(b.ctx)))).toEqual([])
    await expect(updateReview(withJ1(b.ctx), r.id, { isVisible: false })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(removeReview(withJ1(b.ctx), r.id)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect((await listReviews(withJ1(a.ctx))).map((x) => x.id)).toEqual([r.id])
  })

  it("trang công khai chỉ thấy đánh giá đang bật của đúng tổ chức", async () => {
    const shown = await createReview(withJ1(a.ctx), { authorName: "Anh Minh", rating: 4, comment: "Bó hoa xinh, đúng mẫu." })
    const hidden = await createReview(withJ1(a.ctx), { authorName: "Chị Hoa", rating: 5, comment: "Rất hài lòng với tiệm.", isVisible: false })
    await createReview(withJ1(b.ctx), { authorName: "Khách B", rating: 5, comment: "Đánh giá của tiệm khác." })
    const pub = await getPublicReviewsForOrganization(a.organizationId)
    expect(pub.map((p) => p.id)).toEqual([shown.id])
    expect(pub.some((p) => p.id === hidden.id)).toBe(false)
  })

  it("thiếu J1 → từ chối", async () => {
    await expect(listReviews({ ...a.ctx, capabilities: new Set<string>() })).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
  })
})
