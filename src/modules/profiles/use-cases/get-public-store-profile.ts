/**
 * Trang công khai /ch/<slug> — không có phiên đăng nhập; tổ chức suy ra từ
 * slug (không nhận từ trình duyệt). Logo là tài sản riêng → URL ký có hạn.
 */
import type { IStoreShareLinkRepository } from "@/modules/profiles/domain/repositories/store-share-link-repository.interface"
import { getStoreShareLinkRepository } from "@/modules/profiles/infra/store-share-link-repository"
import { buildPublicStoreProfile, type PublicStoreProfile } from "@/modules/profiles/domain/store-share-page"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { ASSET_VIEW_URL_TTL_SECONDS } from "@/modules/assets/use-cases/get-asset-view-url"

const SLUG_SHAPE = /^[a-z0-9-]{3,100}$/

export type PublicStoreProfileResult =
  | { status: "NOT_FOUND" }
  | { status: "REVOKED" }
  | { status: "ACTIVE"; profile: PublicStoreProfile }

export async function getPublicStoreProfile(
  slug: string,
  repo: IStoreShareLinkRepository = getStoreShareLinkRepository()
): Promise<PublicStoreProfileResult> {
  if (!SLUG_SHAPE.test(slug)) return { status: "NOT_FOUND" }
  const raw = await repo.findPublic(slug)
  if (!raw) return { status: "NOT_FOUND" }
  if (raw.revoked) return { status: "REVOKED" }

  let logoUrl: string | null = null
  if (raw.logo?.kind === "URL") logoUrl = raw.logo.url
  if (raw.logo?.kind === "ASSET") {
    try {
      logoUrl = await getStorageProvider().signedUrl(raw.logo.storageKey, ASSET_VIEW_URL_TTL_SECONDS, "GET")
    } catch {
      logoUrl = null // thiếu logo thì ẩn, trang vẫn dùng được
    }
  }

  return {
    status: "ACTIVE",
    profile: buildPublicStoreProfile({
      orgName: raw.orgName,
      business: raw.business,
      primaryColor: raw.primaryColor,
      logoUrl,
    }),
  }
}

/** Đếm lượt xem; lỗi đếm không được làm hỏng trang khách. */
export async function recordStoreProfileView(
  slug: string,
  repo: IStoreShareLinkRepository = getStoreShareLinkRepository()
): Promise<void> {
  try {
    await repo.incrementViews(slug)
  } catch {
    // bỏ qua
  }
}
