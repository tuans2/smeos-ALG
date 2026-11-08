/**
 * Khối "Thông tin cửa hàng" của Landing page chính thức (mục Thương hiệu bước 3, PO 08/11/2026). Đọc SỐNG từ
 * Hồ sơ cửa hàng mỗi lần khách mở trang — chủ tiệm sửa giờ mở cửa, ảnh, video ở Hồ sơ hay Cài đặt thì trang tự
 * đổi theo, không phải xuất bản lại. Chỉ trường được phép hiện công khai (cùng luật trang chia sẻ `/ch`).
 */
import { readBrandMaterials } from "@/modules/brand-kit/domain/brand-assets"
import { buildPublicStoreProfile, type ContactAction, type SocialLink } from "@/modules/profiles/domain/store-share-page"

export interface PublicOfficialStoreInfo {
  readonly slogan: string | null
  readonly description: string | null
  readonly hours: string | null
  readonly address: string | null
  readonly actions: readonly ContactAction[]
  readonly socials: readonly SocialLink[]
  /** Ảnh cửa hàng đã ký URL, theo thứ tự chủ tiệm sắp */
  readonly photos: readonly string[]
  readonly introVideo: string | null
}

type BizRaw = {
  display_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  description: string | null
  social_links: unknown
  operating_hours: unknown
} | null

type BrandRaw = { primary_color: string | null; slogan?: string | null; brand_assets: unknown } | null

export async function buildOfficialStoreInfo(
  raw: { orgName: string; business: BizRaw; brand: BrandRaw },
  sign: (urlOrKey: string) => Promise<string | null>
): Promise<PublicOfficialStoreInfo> {
  const business = raw.business ? { ...raw.business, display_name: raw.business.display_name ?? raw.orgName } : null
  const profile = buildPublicStoreProfile({ orgName: raw.orgName, business, primaryColor: raw.brand?.primary_color ?? null, logoUrl: null })
  const m = readBrandMaterials(raw.brand?.brand_assets)
  const photos = (await Promise.all(m.storefrontPhotos.map((p) => sign(p)))).filter((p): p is string => Boolean(p))
  const video = m.introVideo ? await sign(m.introVideo) : null
  return {
    slogan: raw.brand?.slogan?.trim() || null,
    description: profile.description,
    hours: profile.hours,
    address: profile.address,
    actions: profile.actions,
    socials: profile.socials,
    photos,
    introVideo: video,
  }
}
