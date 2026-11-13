/**
 * Công cụ 11 — quản lý link hồ sơ cửa hàng công khai.
 * Xem: F1 · tạo/thu hồi (xuất bản công khai, R3): F2.
 */
import { notFound, validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import type { IStoreShareLinkRepository, StoreShareLinkRecord } from "@/modules/profiles/domain/repositories/store-share-link-repository.interface"
import { getStoreShareLinkRepository } from "@/modules/profiles/infra/store-share-link-repository"
import { generateStoreShareSlug, STORE_SHARE_PATH, type StoreShareLinkView } from "@/modules/profiles/domain/store-share-page"
import { evaluateStoreProfile } from "@/modules/profiles/domain/store-profile-completeness"
import { getBusinessProfile } from "./get-business-profile"
import { getBrandProfile } from "./get-brand-profile"

const MAX_SLUG_ATTEMPTS = 5

function toView(r: StoreShareLinkRecord): StoreShareLinkView {
  return { slug: r.slug, path: `${STORE_SHARE_PATH}/${r.slug}`, view_count: r.view_count, created_at: r.created_at.toISOString() }
}

export async function getStoreShareLink(
  ctx: TenantContext,
  repo: IStoreShareLinkRepository = getStoreShareLinkRepository()
): Promise<StoreShareLinkView | null> {
  requireCapability(ctx, "F1")
  const link = await repo.findActive(ctx)
  return link ? toView(link) : null
}

export async function createStoreShareLink(
  ctx: TenantContext,
  repo: IStoreShareLinkRepository = getStoreShareLinkRepository()
): Promise<StoreShareLinkView> {
  requireCapability(ctx, "F2")

  // Chỉ xuất bản khi hồ sơ đủ mục thiết yếu — kiểm ở máy chủ, không tin giao diện.
  const [business, brand] = await Promise.all([getBusinessProfile(ctx), getBrandProfile(ctx)])
  const completeness = evaluateStoreProfile({ business, brand })
  if (!completeness.readyToShare) {
    throw validationFailed({
      profile: "Hồ sơ còn thiếu thông tin cần thiết",
      missing: completeness.missing.filter((i) => i.essential).map((i) => i.label),
    })
  }

  const existing = await repo.findActive(ctx)
  if (existing) return toView(existing)

  const name = business?.display_name ?? "cua-hang"
  let slug = generateStoreShareSlug(name)
  for (let i = 0; i < MAX_SLUG_ATTEMPTS && (await repo.slugExists(slug)); i++) {
    slug = generateStoreShareSlug(name)
  }
  if (await repo.slugExists(slug)) {
    throw validationFailed({ slug: "Không tạo được đường dẫn riêng, vui lòng thử lại" })
  }
  return toView(await repo.createIfNoActive(ctx, slug))
}

export async function revokeStoreShareLink(
  ctx: TenantContext,
  repo: IStoreShareLinkRepository = getStoreShareLinkRepository()
): Promise<void> {
  requireCapability(ctx, "F2")
  if (!(await repo.revokeActive(ctx))) throw notFound()
}
